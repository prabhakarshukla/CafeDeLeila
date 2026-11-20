const {execFileSync} = require('node:child_process');
const {readFileSync} = require('node:fs');

const tracked = execFileSync('git', ['ls-files', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
const guide = readFileSync('docs/report/03-file-guide.md','utf8');
const paths = new Set(Array.from(guide.matchAll(/^\| `([^`]+)` \|/gm), match => match[1]));
const missing = tracked.filter(file => !paths.has(file));
if (missing.length) {
  console.error('Tracked files missing from the report:\n' + missing.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS report coverage: ' + tracked.length + ' tracked files.');
}
