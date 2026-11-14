# Local review build retention

The user explicitly authorized this bounded policy on 2026-11-10 after the checkout reached 87.57 GiB. It **supersedes every older instruction to preserve all historical expanded frozen roots or leave every preview service running**. Original source/assets, Git history, review receipts, release files and private SQLite remain protected. No game feature work resumes as part of storage cleanup.

## Retained state

- Current expanded testing/public pair: source `137dc2c023eb99adefb4574ba746b664ea8f56f8`, protocol 77, 2068 files each, ports 5398/2774 and 5399/2775. Each passed seven native cases. [Verification](../reviews/tank-mobile-bulwark-r2-2026-11-14/frozen-verification.json), [rotation](../reviews/storage-tank-mobile-bulwark-r2-2026-11-14/retention-result.json).
- The sole verified rollback ZIP contains the previous Guide pair, source 21f490af74c2a05c59fa94e1bf3ce6f8614c9279. Archive `output/review-rollback.zip`, SHA 256`d963fda3c0c5d7404cd8916703c2a8716d8c16927a68d294b1d5144c283c81d3`. [Full restore verification](../reviews/storage-tank-mobile-bulwark-r2-2026-11-14/rollback-archive.json).
- The failed 0915 Tank pair was separately retired after both audiences finished 12 pass/2 fail in 14 composed cases. Its original logs, receipts and manifest hashes remain. [Checked retirement](../reviews/storage-tank-attempt-2026-11-14/retention-result.json).
- All 213 pre-existing private SQLite-related files remain byte-exact and local. Original 108-folder/52-process retirement receipts and 124 historical identities remain historical. No retired build was recreated. [Initial cleanup](../reviews/storage-retention-2026-11-10/verification.json).

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
python tools/review-retention.py verify --repo . --receipt reviews/storage-tank-mobile-bulwark-r2-2026-11-14/rollback-archive.json
```

Restore the original files when needed:

```powershell
$reviewState = Get-Content -LiteralPath output/review-retention.json -Raw | ConvertFrom-Json
python tools/review-retention.py restore --archive $reviewState.rollbackArchive --sha256 $reviewState.rollbackArchiveSha256 --into .
```

Existing identical manifest files are verified and retained; conflicting files are never overwritten. Restoration does not start services. Use fresh launch receipts for an explicitly requested rollback; the old launcher writes process receipts, so do not relaunch into an original historical receipt scope. Remove temporary restored copies through a fresh checked retention plan. Private SQLite stays at its original local paths and is excluded from the build archive.
