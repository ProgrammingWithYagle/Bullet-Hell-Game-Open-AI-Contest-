# Local review build retention

The user explicitly authorized this bounded policy on2026-11-10 after the checkout reached87.57GiB. It **supersedes every older instruction to preserve all historical expanded frozen roots or leave every preview service running**. Original source/assets, Git history, review receipts, release files and private SQLite remain protected. No game feature work resumes as part of storage cleanup.

## Retained state

- The current expanded testing and public pair binds source `6a75d36a32875c71a47a139dd32426612cd8c59d` and 2,064 files each. Testing uses ports 5390/2766 and public uses 5391/2767. Each passed seven native cases. [Verification](../reviews/heavy-reserve-anchor-ci-2026-11-12/frozen-verification.json), [rotation receipt](../reviews/storage-reserve-anchor-ci-2026-11-12/retention-result.json).
- The verified rollback archive `output/review-rollback.zip` contains the protocol 74 Lineworker pair, source `ad5925f76ae1279e1503fe79d76d92daa16af80a`. The restore check verified 4,129 files. The archive is 804,293,243 bytes with SHA-256 `ee9576a5bbca3ec6659c48e6947f57a2fde23ff03a8984ff0f1388e542e889fc`. [Rollback receipt](../reviews/storage-reserve-anchor-ci-2026-11-12/rollback-archive.json).
- Original small review logs/manifests and all213private SQLite-related files remain. Every private file matched its pre-cleanup bytes. No private database or private hash manifest was uploaded.

The cleanup retired52older exact preview processes after verifying PID/full command/UTC/listeners, removed108obsolete expanded build directories plus old backend bundles, and reduced logical size from87.568GiB to8.947GiB(~78.621GiB reclaimed). Other output contains historical QA/publication evidence and private records; it was preserved. [Executed result](../reviews/storage-retention-2026-11-10/retention-result.json), [post-cleanup verification](../reviews/storage-retention-2026-11-10/verification.json), [explicit target plan](../reviews/storage-retention-2026-11-10/retention-plan.json). Earlier source67-root byte audits remain true historical observations, not claims that those folders are still present. The old failed unregistered Seam folder was also explicitly retired; its original failed receipts remain.

## Future lifecycle

Use the canonical freezer. Its retention guard permits the current pair plus one pair undergoing verification, and refuses another pair. Complete or retire the pending pair before making more full copies. No browser, deployment, purchase, main merge, clone/worktree or Git reconfiguration is involved.

After a new pair has complete source/CI/native proof, run this command from the existing checkout, substituting its scopes:

```powershell
pwsh -NoProfile -File tools/retain-review-builds.ps1 -CurrentScope reviews/NEW-VERIFIED-PAIR -RollbackScope reviews/PREVIOUS-FULLY-VERIFIED-PAIR -ReceiptScope reviews/NEW-RETENTION-RECEIPT
```

The command verifies promotion eligibility, plans exact paths, makes and fully verifies a deduplicated rollback archive, restores every member into a temporary check tree, captures exact current/retired process identities, and applies only the checked plan. One previous rollback archive is replaced only after the new candidate verifies. If the last fully reviewed rollback is already archived, its verified archive is reused directly; retired expanded folders and backends need not be recreated. This cold-rollback path was exercised against the actual cleaned checkout and produced a byte-identical archive candidate, which was then removed. A partial failure preserves its receipts and must be inspected before retrying; do not overwrite an existing plan, archive candidate or process observation. The initial cleanup was an explicit user-authorized exception retaining the newest partially reviewed pair while archiving the older fully reviewed pair. Automatic future promotion requires full proof.

The state pointer is `output/review-retention.json`. Future preservation audits validate the current pair, rollback archive and retirement ledger. **Do not replay older helper loops that require65/67predecessor folders to exist, or recreate deleted folders merely to satisfy those obsolete assumptions.** Historical source execution hashes stay original. A new archive does not turn old local imports into online proof.

## Inspecting or restoring rollback

Verify without expanding:

```powershell
python tools/review-retention.py verify --repo . --receipt reviews/storage-reserve-anchor-ci-2026-11-12/rollback-archive.json
```

Restore the original files when needed:

```powershell
python tools/review-retention.py restore --archive output/review-rollback.zip --sha256 ee9576a5bbca3ec6659c48e6947f57a2fde23ff03a8984ff0f1388e542e889fc --into .
```

Existing identical manifest files are verified and retained; conflicting files are never overwritten. Restoration does not start services. Use fresh launch receipts for an explicitly requested rollback; the old launcher writes process receipts, so do not relaunch into an original historical receipt scope. Remove temporary restored copies through a fresh checked retention plan. Private SQLite stays at its original local paths and is excluded from the build archive.
