import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { additionalSourceBinding as priorBinding } from '../records-navigation-2026-10-30/review-inputs.mjs';
export function additionalSourceBinding() {
  const scope = 'reviews/shared-network-2026-10-30';
  const files = [...new Set([
    ...priorBinding().members.map(m => m.path),
    ...['review-inputs.mjs', 'server.mts', 'probe.mts', 'freeze-progression.mjs', 'verify-progression.mjs'].map(name => scope + '/' + name),
    ...fs.readdirSync('assets/production/ui/resources').map(name => 'assets/production/ui/resources/' + name),
  ])].sort();
  const hash = createHash('sha256');
  const members = files.map(file => {
    const bytes = fs.readFileSync(file);
    hash.update(file + '\0').update(bytes);
    return { path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
  return { sha256: hash.digest('hex'), files: members.length, bytes: members.reduce((n, m) => n + m.bytes, 0), members };
}
