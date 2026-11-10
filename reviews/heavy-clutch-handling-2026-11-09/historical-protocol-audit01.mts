import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { practiceRecords } from '../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/client/progress.ts';
import { implementedClassIds } from '../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/protocol.ts';
const editions = [
  [69, 'df1b63cc4adf21486fe0e142275b7b7634798f274f6e11de6f737ea0340feb28'],
  [70, 'f28e23fd7430e62d25e262869eadc77f945e62f821c473c638a9b8faefcef589'],
  [71, '76410d1cca4ce1874da61acf3fefa6c359720b62452411c172b2b4f86f788de2']
] as const;
const rows = [];
for (const [issued, revision] of editions) for (const protocol of [issued, 47, issued + 1]) {
  const input = implementedClassIds.map(classId => ({ schemaVersion: 1, id: `${issued}-${protocol}-${classId}`, practiceOnly: true, verified: false, contentRevision: revision, protocol, mode: 'short', difficulty: 'normal', classId, completedEncounters: 5, accords: 0, combatTicks: 6000, secret: 'locked', memorial: false }));
  const found = practiceRecords({ getItem: () => JSON.stringify(input), setItem: () => { throw Error('Read must not rewrite'); } });
  rows.push({ issued, protocol, retained: found.length, expected: protocol === issued ? 12 : 0, exactProtocolOnly: found.length === (protocol === issued ? 12 : 0) });
}
const report = { checkedAt: new Date().toISOString(), beforeAdmission: true, canonicalFilesWritten: false, rows, historical47FallbackBugReproduced: rows.some(r => r.protocol === 47 && r.retained > 0), limits: 'Local historical Practice identity only. No online receipt, file rewrite, private database or source edit.' };
const stage = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.resolve(stage, '../../outputs/Heavy-clutch-handling-historical-protocol-audit01.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report));
