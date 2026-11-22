# Local review build retention

The user explicitly authorized this bounded policy on 2026-11-10 after the checkout reached 87.57 GiB. It **supersedes every older instruction to preserve all historical expanded frozen roots or leave every preview service running**. Original source/assets, Git history, review receipts, release files and private SQLite remain protected. No game feature work resumes as part of storage cleanup.

## Retained state

Source **3c0b8238d686b15bbd37b75fa97b8c1318b451c1**, build **2026.11.21-bard-conductor**, protocol **93**, catalog **116**. The local suite and both GitHub workflows passed 2,841 tests and seven checks. Each frozen audience binds 2,186 files and passed seven checks. Testing uses [5430](http://127.0.0.1:5430/) with backend 2806. Public review uses [5431](http://127.0.0.1:5431/) with backend 2807. [Push workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/44974702977) · [PR workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/44974715409) · [Frozen checks](../reviews/bard-conductor-2026-11-21/frozen-verification.json).

The protocol 92 Assassin Mark Hunter pair is the verified rollback in `output/review-rollback.zip`. All 4,357 restored files match their archived bytes. Archive SHA-256 a830aeaa9220bea8ee113ca6f4298a734f98bad2be1c9211d5c6390ba1ad92ec. All 213 original private SQLite-related files match their inventory. [Rotation](../reviews/storage-bard-conductor-2026-11-21/retention-result.json).

The protocol 80 late-Bastion pair was retired after two exact draft-PR timeouts. Its 22 passing native cases, passing local gate and push workflow, and both original PR logs remain in the review evidence. [Retirement](../reviews/storage-tank-bastion-fittings-timeout-2026-11-18/retention-result.json) · [Saved evidence](../reviews/tank-bastion-fittings-2026-11-18/review-evidence-bindings.json).

Original retirement receipts and earlier package evidence remain under their dated review scopes.

## Future lifecycle

Use the canonical freezer. Its retention guard permits the current pair plus one pair undergoing verification, and refuses another pair. Complete or retire the pending pair before making more full copies. No browser, deployment, purchase, main merge, clone/worktree or Git reconfiguration is involved.

After a new pair has complete source/CI/native proof, run this command from the existing checkout, substituting its scopes:

```powershell
pwsh -NoProfile -File tools/retain-review-builds.ps1 -CurrentScope reviews/NEW-VERIFIED-PAIR -RollbackScope reviews/PREVIOUS-FULLY-VERIFIED-PAIR -ReceiptScope reviews/NEW-RETENTION-RECEIPT
```

The command verifies promotion eligibility, plans exact paths, makes and fully verifies a deduplicated rollback archive, restores every member into a temporary check tree, captures exact current/retired process identities, and applies only the checked plan. One previous rollback archive is replaced only after the new candidate verifies. If the last fully reviewed rollback is already archived, its verified archive is reused directly; retired expanded folders and backends need not be recreated. This cold-rollback path was exercised against the actual cleaned checkout and produced a byte-identical archive candidate, which was then removed. A partial failure preserves its receipts and must be inspected before retrying; do not overwrite an existing plan, archive candidate or process observation. The initial cleanup was an explicit user-authorized exception retaining the newest partially reviewed pair while archiving the older fully reviewed pair. Automatic future promotion requires full proof.

The state pointer is `output/review-retention.json`. Future preservation audits validate the current pair, rollback archive and retirement ledger. **Do not replay older helper loops that require 65/67 predecessor folders to exist, or recreate deleted folders merely to satisfy those obsolete assumptions.** Historical source execution hashes stay original. A new archive does not turn old local imports into online proof.

## Inspecting or restoring rollback

Verify without expanding:

```powershell
python tools/review-retention.py verify --repo . --receipt reviews/storage-tank-interceptor-2026-11-17/rollback-archive.json
```

Restore the original files when needed:

```powershell
$reviewState = Get-Content -LiteralPath output/review-retention.json -Raw | ConvertFrom-Json
python tools/review-retention.py restore --archive $reviewState.rollbackArchive --sha256 $reviewState.rollbackArchiveSha256 --into .
```

Existing identical manifest files are verified and retained; conflicting files are never overwritten. Restoration does not start services. Use fresh launch receipts for an explicitly requested rollback; the old launcher writes process receipts, so do not relaunch into an original historical receipt scope. Remove temporary restored copies through a fresh checked retention plan. Private SQLite stays at its original local paths and is excluded from the build archive.
