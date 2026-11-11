# Local review build retention

The user explicitly authorized this bounded policy on2026-11-10 after the checkout reached87.57GiB. It **supersedes every older instruction to preserve all historical expanded frozen roots or leave every preview service running**. Original source/assets, Git history, review receipts, release files and private SQLite remain protected. No game feature work resumes as part of storage cleanup.

## Retained state

- One current expanded testing/public pair: source30fbfefaa66faabd93416dc31e27310149df5fed, testing5382/2758 and public5383/2759,2,060files each. The four original exact services/listeners remain. Current native review still has the documented legal21SP wrapper failure; storage cleanup does not promote that proof.
- One local verified rollback archive: `output/review-rollback.zip`, source20aad19bdfb8819cd7db0483b9c79f2c6e9dcd5c, from the last fully reviewed source72 pair. It contains4,107restorable files in2,059unique content objects,791,971,124bytes(~0.74GiB). SHA256 `21ceabead7c881c906b2828ac85c5043ba7169ce442abad808eeb73f9b38dd32`. Duplicate content is stored once. Both original build roots, frozen backend and bound manifests restore byte-exact. External project Node modules are still required; original dependency recipes remain in Git.
- Original small review logs/manifests and all213private SQLite-related files remain. Every private file matched its pre-cleanup bytes. No private database or private hash manifest was uploaded.

The cleanup retired52older exact preview processes after verifying PID/full command/UTC/listeners, removed108obsolete expanded build directories plus old backend bundles, and reduced logical size from87.568GiB to8.947GiB(~78.621GiB reclaimed). Other output contains historical QA/publication evidence and private records; it was preserved. [Executed result](../reviews/storage-retention-2026-11-10/retention-result.json), [post-cleanup verification](../reviews/storage-retention-2026-11-10/verification.json), [explicit target plan](../reviews/storage-retention-2026-11-10/retention-plan.json). Earlier source67-root byte audits remain true historical observations, not claims that those folders are still present. The old failed unregistered Seam folder was also explicitly retired; its original failed receipts remain.

## Future lifecycle

Use the canonical freezer. Its retention guard permits the current pair plus one pair undergoing verification, and refuses another pair. Complete or retire the pending pair before making more full copies. No browser, deployment, purchase, main merge, clone/worktree or Git reconfiguration is involved.

After a new pair has complete source/CI/native proof, run this command from the existing checkout, substituting its scopes:

```powershell
pwsh -NoProfile -File tools/retain-review-builds.ps1 -CurrentScope reviews/NEW-VERIFIED-PAIR -RollbackScope reviews/PREVIOUS-FULLY-VERIFIED-PAIR -ReceiptScope reviews/NEW-RETENTION-RECEIPT
```

The command verifies promotion eligibility, plans exact paths, makes and fully verifies a deduplicated rollback archive, restores every member into a temporary check tree, captures exact current/retired process identities, and applies only the checked plan. One previous rollback archive is replaced only after the new candidate verifies. A partial failure preserves its receipts and must be inspected before retrying; do not overwrite an existing plan, archive candidate or process observation. The initial cleanup was an explicit user-authorized exception retaining the newest partially reviewed pair while archiving the older fully reviewed pair. Automatic future promotion requires full proof.

The state pointer is `output/review-retention.json`. Future preservation audits validate the current pair, rollback archive and retirement ledger. **Do not replay older helper loops that require65/67predecessor folders to exist, or recreate deleted folders merely to satisfy those obsolete assumptions.** Historical source execution hashes stay original. A new archive does not turn old local imports into online proof.

## Inspecting or restoring rollback

Verify without expanding:

```powershell
python tools/review-retention.py verify --repo . --receipt reviews/storage-retention-2026-11-10/rollback-archive.json
```

Restore the original files when needed:

```powershell
python tools/review-retention.py restore --archive output/review-rollback.zip --sha256 21ceabead7c881c906b2828ac85c5043ba7169ce442abad808eeb73f9b38dd32 --into .
```

Existing identical manifest files are verified and retained; conflicting files are never overwritten. Restoration does not start services. Use fresh launch receipts for an explicitly requested rollback; the old launcher writes process receipts, so do not relaunch into an original historical receipt scope. Remove temporary restored copies through a fresh checked retention plan. Private SQLite stays at its original local paths and is excluded from the build archive.
