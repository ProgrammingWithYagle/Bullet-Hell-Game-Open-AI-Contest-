$ErrorActionPreference = 'Stop'
$cleanupWorkspace = [IO.Path]::GetFullPath((Get-Location).Path)
$cleanupScope = Join-Path $cleanupWorkspace 'reviews/browser-release-fixes-2026-10-30'
$cleanupPlanPath = Join-Path $cleanupScope 'storage-cleanup-plan.json'
$cleanupPlan = Get-Content -LiteralPath $cleanupPlanPath -Raw | ConvertFrom-Json
if ($cleanupPlan.root -ne $cleanupWorkspace) { throw 'Cleanup plan belongs to a different workspace' }
$cleanupBackupCommit = 'd7044b7490c226ba25aa9083007271a7b5336eba'
$cleanupRemoteHead = ((& git -c core.bare=false ls-remote origin refs/heads/feat/first-playable-loop) -split '\s+')[0]
if ($LASTEXITCODE -ne 0 -or $cleanupRemoteHead -ne $cleanupBackupCommit) { throw 'Important records are not confirmed backed up to the expected GitHub branch' }
$cleanupTracked = & git -c core.bare=false ls-files
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect tracked files' }
$cleanupProcesses = @(Get-CimInstance Win32_Process)
$cleanupBeforeFree = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($cleanupWorkspace)).AvailableFreeSpace
$cleanupRemoved = [Collections.Generic.List[object]]::new()
$cleanupSkipped = [Collections.Generic.List[object]]::new()
$cleanupPrivateCopies = [Collections.Generic.List[object]]::new()
$cleanupFailures = [Collections.Generic.List[object]]::new()
$cleanupProtected = @('output/playtest-browser-fixes-testing-8c75bb8-r02', 'output/playtest-browser-fixes-public-8c75bb8-r02', 'release/Grave-Accord-2026.10.30-shared-network-public-win32-x64')
$cleanupOutputPrefix = [IO.Path]::GetFullPath((Join-Path $cleanupWorkspace 'output')) + [IO.Path]::DirectorySeparatorChar
$cleanupReleasePrefix = [IO.Path]::GetFullPath((Join-Path $cleanupWorkspace 'release')) + [IO.Path]::DirectorySeparatorChar
$cleanupPrivateRoot = Join-Path $cleanupWorkspace 'output/storage-retained-sqlite-2026-10-31'
$cleanupReportPath = Join-Path $cleanupScope 'storage-cleanup-result.json'
if (Test-Path -LiteralPath $cleanupReportPath) { throw 'Preserve an issued cleanup result' }

foreach ($cleanupItem in $cleanupPlan.items) {
  $cleanupRelative = [string]$cleanupItem.path
  $cleanupTarget = [IO.Path]::GetFullPath((Join-Path $cleanupWorkspace $cleanupRelative))
  if ($cleanupTarget -ne [IO.Path]::GetFullPath([string]$cleanupItem.absolutePath)) { throw 'Plan path binding differs' }
  if (-not ($cleanupTarget.StartsWith($cleanupOutputPrefix, [StringComparison]::OrdinalIgnoreCase) -or $cleanupTarget.StartsWith($cleanupReleasePrefix, [StringComparison]::OrdinalIgnoreCase))) { throw 'Deletion target escaped generated-output roots' }
  if ($cleanupRelative -in $cleanupProtected) { throw 'A current verified build was selected' }
  if (@($cleanupTracked | Where-Object { $_ -eq $cleanupRelative -or $_.StartsWith($cleanupRelative + '/') }).Count) { throw 'A selected directory contains tracked source/evidence' }
  if (-not (Test-Path -LiteralPath $cleanupTarget -PathType Container)) {
    $cleanupSkipped.Add([ordered]@{ path = $cleanupRelative; reason = 'Already absent before cleanup' }); continue
  }
  $cleanupRootItem = Get-Item -LiteralPath $cleanupTarget -Force
  if ($cleanupRootItem.LinkType -in @('Junction', 'SymbolicLink')) { throw 'Refusing a directory link' }
  $cleanupTargetNormalized = $cleanupTarget.Replace('\', '/')
  $cleanupInUse = @($cleanupProcesses | Where-Object {
    ($_.ExecutablePath -and ($_.ExecutablePath.Replace('\', '/').StartsWith($cleanupTargetNormalized + '/', [StringComparison]::OrdinalIgnoreCase))) -or
    ($_.CommandLine -and (($_.CommandLine.Replace('\', '/') -match ([regex]::Escape($cleanupTargetNormalized) + '(?:["\s/]|$)')) -or ($_.CommandLine.Replace('\', '/') -match ([regex]::Escape($cleanupRelative) + '(?:["\s/]|$)'))))
  })
  if ($cleanupInUse.Count) {
    $cleanupSkipped.Add([ordered]@{ path = $cleanupRelative; reason = 'Active process uses this generated copy'; pids = @($cleanupInUse.ProcessId) }); continue
  }
  try {
    # Preserve any old local SQLite data privately; do not upload it to GitHub.
    foreach ($cleanupDb in @(Get-ChildItem -LiteralPath $cleanupTarget -Recurse -File -Filter '*.sqlite*')) {
      $cleanupDbRelative = [IO.Path]::GetRelativePath($cleanupWorkspace, $cleanupDb.FullName)
      $cleanupDbCopy = [IO.Path]::GetFullPath((Join-Path $cleanupPrivateRoot $cleanupDbRelative))
      if (-not $cleanupDbCopy.StartsWith($cleanupPrivateRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Private data backup escaped its destination' }
      [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($cleanupDbCopy)) | Out-Null
      Copy-Item -LiteralPath $cleanupDb.FullName -Destination $cleanupDbCopy -ErrorAction Stop
      if ((Get-FileHash -LiteralPath $cleanupDb.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $cleanupDbCopy -Algorithm SHA256).Hash) { throw 'Private data backup differs' }
      $cleanupPrivateCopies.Add([ordered]@{ from = $cleanupDb.FullName; preservedAt = $cleanupDbCopy; bytes = $cleanupDb.Length })
    }
    # The resolved absolute path, permitted root, protected roots, tracked files and process usage were checked above.
    Remove-Item -LiteralPath $cleanupTarget -Recurse -Force -ErrorAction Stop
    if (Test-Path -LiteralPath $cleanupTarget) { throw 'Directory remains after removal' }
    $cleanupRemoved.Add([ordered]@{ path = $cleanupRelative; logicalBytes = [long]$cleanupItem.bytes; files = [int]$cleanupItem.files; reason = $cleanupItem.reason })
  } catch {
    $cleanupFailures.Add([ordered]@{ path = $cleanupRelative; error = $_.Exception.Message })
  }
  if (($cleanupRemoved.Count + $cleanupSkipped.Count + $cleanupFailures.Count) % 10 -eq 0) {
    Write-Output ([ordered]@{ removedDirectories = $cleanupRemoved.Count; logicalGiBRemoved = [math]::Round((($cleanupRemoved | Measure-Object -Property logicalBytes -Sum).Sum / 1GB), 2); skipped = $cleanupSkipped.Count; failures = $cleanupFailures.Count } | ConvertTo-Json -Compress)
  }
}
$cleanupAfterFree = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($cleanupWorkspace)).AvailableFreeSpace
$cleanupReport = [ordered]@{
  completedAt = [DateTime]::UtcNow.ToString('o'); passed = $cleanupFailures.Count -eq 0
  authorization = $cleanupPlan.authorizedBy; workspace = $cleanupWorkspace
  planSha256 = (Get-FileHash -LiteralPath $cleanupPlanPath -Algorithm SHA256).Hash.ToLowerInvariant()
  backedUpGitHubCommit = $cleanupBackupCommit; trackedSourceDeleted = $false; artworkDeleted = $false; gitHistoryChanged = $false
  removedDirectories = $cleanupRemoved.Count; logicalBytesRemoved = [long](($cleanupRemoved | Measure-Object -Property logicalBytes -Sum).Sum)
  driveFreeBytesBefore = $cleanupBeforeFree; driveFreeBytesAfter = $cleanupAfterFree; driveFreeBytesIncrease = $cleanupAfterFree - $cleanupBeforeFree
  removed = @($cleanupRemoved.ToArray()); skipped = @($cleanupSkipped.ToArray()); failures = @($cleanupFailures.ToArray()); privatelyPreservedSqlite = @($cleanupPrivateCopies.ToArray())
  keptCurrentRoots = $cleanupProtected
  limits = @('Removed only obsolete untracked generated copies selected in the committed plan. All ZIP archives and small release sidecars remain.', 'Drive free space can also change due to other apps or OneDrive. Historical review receipts retain their original paths, which may now be removed generated copies.')
}
[IO.File]::WriteAllText($cleanupReportPath, ($cleanupReport | ConvertTo-Json -Depth 8) + "`n", [Text.UTF8Encoding]::new($false))
Write-Output ([ordered]@{ passed = $cleanupReport.passed; removedDirectories = $cleanupReport.removedDirectories; logicalGiBRemoved = [math]::Round($cleanupReport.logicalBytesRemoved / 1GB, 2); driveFreeGiBIncrease = [math]::Round($cleanupReport.driveFreeBytesIncrease / 1GB, 2); skipped = $cleanupSkipped.Count; failures = $cleanupFailures.Count } | ConvertTo-Json -Compress)
