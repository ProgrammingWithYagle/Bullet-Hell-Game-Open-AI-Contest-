# Local review build retention

The user explicitly authorized this bounded policy on 2026-11-10 after the checkout reached 87.57 GiB. It **supersedes every older instruction to preserve all historical expanded frozen roots or leave every preview service running**. Original source/assets, Git history, review receipts, release files and private SQLite remain protected. No game feature work resumes as part of storage cleanup.

## Retained state

Source **ec18a2786c9e5935431e92c1482d97b836610c64**, build **2026.11.19-medic-surgery-fittings**, protocol **84**, catalog **89**. The local gate and both exact GitHub workflows passed 2,683 tests and all seven checks. Each frozen audience binds 2,094 files and passed eleven checks. Testing uses [5412](http://127.0.0.1:5412/) with backend 2788. Public review uses [5413](http://127.0.0.1:5413/) with backend 2789. [Push workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/44669006051) · [PR workflow](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/actions/runs/44669025410) · [Frozen results](../reviews/medic-surgery-fittings-2026-11-19/frozen-verification.json) · [Saved evidence](../reviews/medic-surgery-fittings-2026-11-19/publication-byte-bindings.json).

The protocol 83 Field Surgery pair is the verified rollback in `output/review-rollback.zip`. All 4,183 restored files matched their archived bytes. Archive SHA-256 `9d7a8ea2590f24b3d25d60d0f850736e81fec7b847e6989e341e0637268e1eb1`. All 213 original private SQLite-related files matched their inventory. [Rotation](../reviews/storage-medic-surgery-fittings-2026-11-19/retention-result.json).

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
