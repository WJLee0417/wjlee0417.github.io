import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const lock = JSON.parse(fs.readFileSync(new URL('../portfolio_codex_bundle/evidence-artifacts.lock.json', import.meta.url), 'utf8'));
const data = JSON.parse(fs.readFileSync(new URL('../portfolio_codex_bundle/portfolio-data.json', import.meta.url), 'utf8'));
const { revision, ...expectedManifest } = lock;
const online = process.argv.includes('--online');
const localArg = process.argv.indexOf('--local');
const localRoot = path.resolve(localArg < 0 ? 'evidence.local' : process.argv[localArg + 1]);
const repository = new URL(lock.repositoryUrl);
const rawBase = `https://raw.githubusercontent.com${repository.pathname}/${revision}/`;
async function read(relative) {
  if (relative.split('/').some(part => part === '..' || part === '.') || path.isAbsolute(relative)) throw new Error('Unsafe artifact path');
  if (!online) return fs.readFileSync(path.join(localRoot, relative));
  const response = await fetch(rawBase + relative);
  if (!response.ok) throw new Error(`Artifact HTTP ${response.status}: ${relative}`);
  return Buffer.from(await response.arrayBuffer());
}
assert.deepEqual(JSON.parse((await read('manifest.json')).toString('utf8')), expectedManifest, 'Published manifest differs from site lock');
const files = [...new Map([...lock.artifacts, ...lock.importedFiles].map(file => [file.path, file])).values()];
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < files.length) {
    const file = files[cursor++];
    const actual = crypto.createHash('sha256').update(await read(file.path)).digest('hex');
    assert.equal(actual, file.sha256, `Artifact hash mismatch: ${file.path}`);
  }
}));
for (const artifact of lock.artifacts) {
  const evidence = data.dimensions.evidence.find(e => e.id === artifact.evidenceId);
  assert.equal(evidence?.url, `${lock.repositoryUrl}/blob/${revision}/${artifact.path}`, `Incorrect evidence link: ${artifact.evidenceId}`);
}
console.log(`PASS: ${lock.artifacts.length} evidence links, ${files.length} file hashes and pinned manifest (${online ? 'GitHub' : 'local'})`);
