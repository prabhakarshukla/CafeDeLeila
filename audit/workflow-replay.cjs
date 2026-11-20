const assert = require('node:assert/strict');
const fs = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');
const {setupDatabase} = require('./db-replay.cjs');
const {loadHandler} = require('./order-contract.cjs');

const read = file => fs.readFileSync(file, 'utf8');
const migrations = fs.readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort();
const apply = (db, file) => db.exec(read('supabase/migrations/' + file));
const owner = '1e9d8640-54aa-4c96-a739-c8286f814483';
const alignment = migrations.find(file => file.startsWith('007_'));

async function loadLegacy(db) {
  // The archive starts with contact_messages and assumes the other tables already exist.
  // Build that missing prefix with the exact legacy checks and defaults from the SQL export.
  const prefix = read('supabase/migrations/001_core_schema.sql').split('-- Contact Messages')[0]
    .replace(/DEFAULT gen_random_uuid\(\)/g, 'DEFAULT uuid_generate_v4()')
    .replaceAll("'dine_in'", "'dine-in'")
    .replace("'unpaid', 'paid', 'failed', 'refunded'", "'pending', 'paid', 'failed', 'refunded'")
    .replace("DEFAULT 'unpaid'", "DEFAULT 'pending'")
    .replace(", 'out_for_delivery'", '')
    .replaceAll("'no_show'", "'no-show'");
  await db.exec('CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$SELECT gen_random_uuid()$$');
  await db.exec(prefix);
  await db.exec(read('supabase/legacy/supabase-schema.sql'));
  await db.exec(`
    INSERT INTO orders(customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr)
    VALUES ('Legacy order', '919000000001', '[]', 80, 0, 80);
    INSERT INTO orders(customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr, payment_status)
    VALUES ('Legacy failed', '919000000001', '[]', 80, 0, 80, 'failed');
    INSERT INTO bookings(customer_name, customer_phone, booking_date, booking_time, guests, status)
    VALUES ('Legacy booking', '919000000001', current_date, '12:00', 2, 'no-show');
  `);
  for (const file of migrations.slice(1)) {
    await apply(db,file);
    if (file.startsWith('003_')) await db.exec('ALTER TABLE order_status_history ALTER COLUMN id SET DEFAULT uuid_generate_v4()');
  }
}

function postgresClient(db) {
  const query = async (sql, params, single = false) => {
    try {
      const {rows} = await db.query(sql, params);
      return {data:single ? rows[0] : rows, error:null};
    } catch (error) {
      console.error('Local PostgreSQL fixture error:', error.code, error.message);
      return {data:null,error};
    }
  };
  return {
    from(table) {
      if (table === 'menu_items') {
        const chain = {
          select() { return chain; },
          eq(name,value) {
            assert.deepEqual([name,value], ['category.is_active',true]);
            return chain;
          },
          in(name, ids) {
            assert.equal(name,'id');
            return query('SELECT i.* FROM menu_items i JOIN menu_categories c ON i.category_id = c.id WHERE c.is_active AND i.id = ANY($1::uuid[])', [ids]);
          },
        };
        return chain;
      }
      if (table === 'settings') return {
        select() {return this;},
        in(name, keys) {
          assert.equal(name,'key');
          return query('SELECT key,value FROM settings WHERE key = ANY($1::text[])', [keys]);
        },
      };
      assert(['orders','contact_messages','job_applications'].includes(table));
      return {
        insert(row) {
          const columns = Object.keys(row);
          assert(columns.every(name => /^[a-z_]+$/.test(name)));
          const values = Object.values(row).map(value => value && typeof value === 'object' ? JSON.stringify(value) : value);
          const sql = `INSERT INTO public.${table} (${columns.join(',')}) VALUES (${values.map((_, i) => '$' + (i + 1)).join(',')})`;
          return {then: resolve => query(sql,values).then(resolve),
            select: () => ({single: () => query(sql + ' RETURNING *',values,true)})};
        },
      };
    },
    rpc(name, args) {
      if (name === 'reserve_booking') {
        return query('SELECT b.* FROM public.reserve_booking($1::jsonb) AS b', [JSON.stringify(args.details)], true);
      }
      assert.equal(name,'allow_submission');
      return query('SELECT public.allow_submission($1,$2) AS allowed',[args.endpoint,args.visitor],true)
        .then(({data,error}) => ({data:data?.allowed,error}));
    },
    storage: {from(bucket) {
      assert.equal(bucket,'cv-uploads');
      return {info: async () => ({error:null})};
    }},
  };
}

async function role(db, name, fn) {
  await db.exec('SET ROLE ' + name);
  try { return await fn(); }
  finally { await db.exec('RESET ROLE'); }
}

async function main() {
  const {nextStatuses, orderTypes, paymentStatuses} = await import('../js/workflow.mjs');
  const {addCalendarDays, indiaDate} = await import('../supabase/functions/_shared/india-date.mjs');
  const {bookingRules} = await import('../supabase/functions/_shared/booking-rules.mjs');
  const migration = read('supabase/migrations/' + alignment);
  assert.equal(migration,read('supabase/fixes/' + alignment), 'SQL Editor copy must match the migration');
  let canonical;
  for (const legacy of [false,true]) {
    const db = new PGlite();
    try {
      await setupDatabase(db);
      if (legacy) {
        await loadLegacy(db);
        const {rows:orders} = await db.query('SELECT order_type,payment_status FROM orders ORDER BY payment_status');
        assert.deepEqual(orders,[{order_type:'dine_in',payment_status:'failed'},{order_type:'dine_in',payment_status:'unpaid'}]);
        assert.equal((await db.query('SELECT status FROM bookings')).rows[0].status,'no_show');
      } else for (const file of migrations) await apply(db,file);
      await apply(db,alignment);
      const {checks,columns} = (await db.query(read('scripts/live-sql-report.sql'))).rows[0].report;
      if (legacy) assert.deepEqual({checks,columns},canonical, 'Clean and legacy constraints and defaults must match');
      else canonical = {checks,columns};
      await db.exec(read('supabase/seed/menu_items.sql'));
      await db.exec(`
        UPDATE settings SET value = '{"enabled":true}' WHERE key = 'delivery_enabled';
        UPDATE settings SET value = '{"amount":0}' WHERE key = 'min_order';
        INSERT INTO auth.users VALUES ('${owner}','owner@example.invalid');
        INSERT INTO admin_users(user_id,display_name,role) VALUES ('${owner}','Fixture owner','owner');
        SELECT set_config('request.jwt.claim.sub','${owner}',false);
      `);
      const item = (await db.query('SELECT id,price_inr FROM menu_items LIMIT 1')).rows[0];
      const handlers = Object.fromEntries(['orders','bookings','applications','contact'].map(name =>
        [name,loadHandler(name,postgresClient(db))]));
      let count = 0;
      const fixture = async (table, orderType) => {
        const marker = 'SMOKE_TEST_LOCAL_' + ++count;
        const customer = {customer_name:marker,customer_phone:'919000000001'};
        const requests = {
          orders: ['orders', {...customer,order_type:orderType,items:[{id:item.id,quantity:2,price_inr:1}],
            ...(orderType === 'delivery' && {delivery_address:{full:'Test delivery address'}})}],
          bookings: ['bookings', {...customer,booking_date:addCalendarDays(indiaDate(),2),
            booking_time:bookingRules.timeSlots[0],guests:2}],
          job_applications: ['applications', {full_name:marker,email:'fixture@example.invalid',
            phone:customer.customer_phone,role:'Kitchen',cv_path:'cvs/895fbcf0-2410-80cd-8e6a-23074755466a-fixture.pdf'}],
          contact_messages: ['contact', {name:marker,email:'fixture@example.invalid',subject:'Fixture',message:'Smoke test'}],
        };
        const [name, body] = requests[table];
        const response = await role(db, 'service_role', () => handlers[name](new Request('https://fixture.invalid/' + name,
          {method:'POST',body:JSON.stringify(body)})));
        assert.equal(response.status, name === 'contact' ? 201 : 200, table + ' insert via Edge handler');
        const data = await response.json();
        if (table === 'orders') {
          assert.equal(data.order_type,orderType);
          assert.equal(data.payment_status,'unpaid');
          assert.equal(data.subtotal_inr,item.price_inr * 2);
        }
        if (name !== 'contact') return data.id;
        return (await db.query('SELECT id FROM public.contact_messages WHERE name = $1', [marker])).rows[0].id;
      };
      const setStatus = (table,id,status) => role(db,'authenticated',async () => {
        const result = await db.query(`UPDATE public.${table} SET status = $1 WHERE id = $2 RETURNING status`,[status,id]);
        assert.deepEqual(result.rows,[{status}]);
      });
      const paths = (table,status,type) => {
        const next = nextStatuses(table,status,type);
        return next.length ? next.flatMap(value => paths(table,value,type).map(rest => [value,...rest])) : [[]];
      };
      for (const table of ['orders','bookings','job_applications','contact_messages']) {
        const start = table === 'contact_messages' ? 'new' : 'pending';
        for (const type of table === 'orders' ? orderTypes : [undefined]) {
          for (const path of paths(table,start,type)) {
            const id = await fixture(table,type);
            if (table === 'orders') {
              await assert.rejects(setStatus(table,id,'completed'), {code:'P0001'});
              await role(db,'authenticated',async () => {
                for (const status of paymentStatuses) {
                  const result = await db.query('UPDATE orders SET payment_status = $1 WHERE id = $2 RETURNING payment_status',[status,id]);
                  assert.deepEqual(result.rows,[{payment_status:status}]);
                }
              });
            }
            for (const status of path) {
              await setStatus(table,id,status);
              if (table === 'orders' && type !== 'delivery' && status === 'ready') {
                await assert.rejects(setStatus(table,id,'out_for_delivery'), {code:'P0001'});
              }
            }
            if (table === 'orders') {
              const {rows} = await db.query('SELECT from_status, to_status FROM order_status_history WHERE order_id = $1',[id]);
              assert.deepEqual(new Set(rows.map(row => row.from_status + ':' + row.to_status)),
                new Set(path.map((status,index) => (index ? path[index-1] : start) + ':' + status)));
              assert.equal(rows.length,path.length);
            }
          }
        }
      }
      console.log('PASS ' + (legacy ? 'legacy upgrade' : 'clean apply') + ': actual Edge inserts and every admin transition');
    } finally { await db.close(); }
  }
}

main().catch(error => {console.error(error);process.exitCode = 1;});
