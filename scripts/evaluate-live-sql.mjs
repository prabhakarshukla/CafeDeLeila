import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';

const baselinePath = new URL('./expected-live-state.json', import.meta.url);
const defaultReport = new URL('../audit/live-sql-report.json', import.meta.url);
const expected = JSON.parse(await readFile(baselinePath, 'utf8'));

const sorted = values => [...values].sort();
const sql = value => typeof value === 'string'
  ? value.replace(/\bpublic\.(?=[a-z_])/gi, '').replace(/\s+/g, ' ').trim().replace(/;$/, '') : value;
const indexes = (rows, key) => new Map(rows.map(row => [key(row), row]));
const policyKey = row => [row.schemaname, row.tablename, row.policyname].join('.');
const triggerKey = row => [row.schema, row.table_name, row.name].join('.');
const functionKey = row => row.name + '(' + sql(row.arguments) + ')';
const relationKey = row => row.schema + '.' + row.name;
const operational = new Set(['orders', 'bookings', 'job_applications', 'contact_messages']);

function unwrap(value) {
  if (Array.isArray(value) && value.length === 1) return unwrap(value[0]);
  if (value && typeof value === 'object' && 'report' in value) return unwrap(value.report);
  if (typeof value === 'string') return unwrap(JSON.parse(value));
  return value;
}

function evaluate(actual) {
  const results = [];
  const check = (name, pass) => results.push({name, pass: Boolean(pass)});
  if (!actual || actual.format_version !== expected.format_version ||
      !['tables','policies','buckets','functions','views','triggers','realtime','columns']
        .every(key => Array.isArray(actual[key]))) throw new Error('Unrecognized report format.');

  const tables = indexes(actual.tables, relationKey);
  for (const row of expected.tables) check('RLS on public.' + row.name, tables.get('public.' + row.name)?.rls === true);
  check('Storage object RLS', tables.get('storage.objects')?.rls === true);
  check('Public base-table inventory', isDeepStrictEqual(
    sorted(actual.tables.filter(row => row.schema === 'public').map(row => row.name)),
    sorted(expected.tables.map(row => row.name)),
  ));
  for (const row of expected.operational_grants) {
    const observed = tables.get(relationKey(row));
    check('Operational table grants on ' + row.name, observed?.anon_select === true &&
      observed?.anon_insert === false && observed?.authenticated_insert === false);
  }
  const policies = indexes(actual.policies, policyKey);
  for (const row of expected.policies) {
    const observed = policies.get(policyKey(row));
    check('Policy ' + policyKey(row), !!observed &&
      observed.cmd === row.cmd && observed.permissive === row.permissive &&
      isDeepStrictEqual(sorted(observed.roles ?? []), sorted(row.roles)) &&
      sql(observed.qual) === sql(row.qual) && sql(observed.with_check) === sql(row.with_check));
  }
  const expectedPolicies = indexes(expected.policies, policyKey);
  const reviewedTables = new Set(expected.tables.map(row => row.name));
  check('No unexpected application or Storage object policies', !actual.policies.some(row =>
    (row.schemaname === 'public' && reviewedTables.has(row.tablename) ||
      row.schemaname === 'storage' && row.tablename === 'objects') && !expectedPolicies.has(policyKey(row))));
  check('No public or anonymous writes to operational tables', !actual.policies.some(row =>
    row.schemaname === 'public' && operational.has(row.tablename) && ['INSERT', 'ALL'].includes(row.cmd) &&
    row.roles.some(role => ['public','anon','authenticated'].includes(role))));

  const buckets = indexes(actual.buckets, row => row.id);
  for (const row of expected.buckets) {
    const observed = buckets.get(row.id);
    check('Bucket ' + row.id, observed?.public === row.public && observed?.file_size_limit === row.file_size_limit &&
      isDeepStrictEqual(sorted(observed?.allowed_mime_types ?? []), sorted(row.allowed_mime_types)));
  }
  const functions = indexes(actual.functions, functionKey);
  for (const row of expected.functions) {
    const observed = functions.get(functionKey(row));
    if (!observed && row.optional) {
      check('Optional legacy function ' + functionKey(row) + ' is absent', true);
      continue;
    }
    check('Function ' + functionKey(row), !!observed && sql(observed.returns) === sql(row.returns) &&
      ['security_definer','language','volatility','anon_exec','authenticated_exec'].every(key => observed[key] === row[key]) &&
      (!('configuration' in row) || isDeepStrictEqual(observed.configuration, row.configuration)));
  }
  check('No executable overloads of application functions', !actual.functions.some(row =>
    expected.functions.some(wanted => wanted.name === row.name) &&
    !expected.functions.some(wanted => functionKey(wanted) === functionKey(row)) &&
    (row.anon_exec || row.authenticated_exec)));
  const views = indexes(actual.views, relationKey);
  for (const row of expected.views) {
    const observed = views.get(relationKey(row));
    check('View ' + row.name, !!observed && observed.anon_select === row.anon_select &&
      observed.authenticated_select === row.authenticated_select &&
      isDeepStrictEqual(sorted(observed.anon_other ?? []), sorted(row.anon_other)) &&
      isDeepStrictEqual(sorted(observed.reloptions ?? []), sorted(row.reloptions)) &&
      sql(observed.definition) === sql(row.definition));
  }
  const triggers = indexes(actual.triggers, triggerKey);
  for (const row of expected.triggers) {
    const observed = triggers.get(triggerKey(row));
    check('Trigger ' + row.table_name + '.' + row.name, observed?.enabled === row.enabled &&
      sql(observed?.definition) === sql(row.definition));
  }
  const expectedTriggers = indexes(expected.triggers, triggerKey);
  check('No unexpected application triggers', !actual.triggers.some(row =>
    row.schema === 'public' && reviewedTables.has(row.table_name) && !expectedTriggers.has(triggerKey(row))));
  check('Realtime publication', isDeepStrictEqual(sorted(actual.realtime.filter(name => name.startsWith('public.'))),
    sorted(expected.realtime)));
  for (const table of new Set(expected.columns.map(row => row.table_name))) {
    const project = rows => rows.filter(row => row.table_name === table)
      .sort((a,b) => a.position - b.position).map(row => ({...row, default:sql(row.default)}));
    check('Columns of ' + table, isDeepStrictEqual(project(actual.columns), project(expected.columns)));
  }
  check('All 12 settings keys exist', expected.settings_keys.every(key => actual.settings_keys?.includes(key)));
  check('public_settings exposes exactly the 12 expected keys',
    isDeepStrictEqual(sorted(actual.public_settings_keys ?? []), sorted(expected.settings_keys)));
  check('Exactly 19 sample categories', actual.row_counts?.menu_categories === expected.sample_menu.categories &&
    isDeepStrictEqual(sorted(actual.category_slugs ?? []), sorted(expected.category_slugs)));
  check('Exactly 80 sample menu rows', actual.row_counts?.menu_items === expected.sample_menu.items);
  check('Soups category exists', actual.soups === true);
  check('At least one owner exists', Number.isInteger(actual.admin_users?.roles?.owner) &&
    actual.admin_users.roles.owner > 0 && actual.admin_users.count >= actual.admin_users.roles.owner);
  return results;
}

try {
  const actual = unwrap(JSON.parse(await readFile(process.argv[2] ?? defaultReport, 'utf8')));
  const results = evaluate(actual);
  for (const {name,pass} of results) console.log((pass ? 'PASS ' : 'FAIL ') + name);
  const failures = results.filter(row => !row.pass).length;
  console.log(`${results.length - failures} passed, ${failures} failed`);
  process.exitCode = failures ? 1 : 0;
} catch {
  console.error('Could not read the SQL Editor report. Save its JSON result and run the evaluator again.');
  process.exitCode = 2;
}
