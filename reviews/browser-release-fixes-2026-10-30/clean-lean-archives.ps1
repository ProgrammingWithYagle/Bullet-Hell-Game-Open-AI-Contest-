$ErrorActionPreference = 'Stop'
$leanWorkspace = [IO.Path]::GetFullPath((Get-Location).Path)
$leanScope = Join-Path $leanWorkspace 'reviews/browser-release-fixes-2026-10-30'
$leanPlan = Get-Content -LiteralPath (Join-Path $leanScope 'lean-archive-cleanup-plan.json') -Raw | ConvertFrom-Json
if ($leanPlan.root -ne $leanWorkspace) { throw 'Plan is not for this workspace' }
$leanRemote = ((& git -c core.bare=false ls-remote origin refs/heads/feat/first-playable-loop) -split '\s+')[0]
if ($LASTEXITCODE -ne 0 -or $leanRemote -ne $leanPlan.backupCommit) { throw 'Expected GitHub backup is not confirmed' }
$leanNativeZip = Join-Path $leanWorkspace $leanPlan.latestNativeZip
if ((Get-FileHash -LiteralPath $leanNativeZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $leanPlan.latestNativeZipSha256) { throw 'Latest native ZIP differs' }
$leanAllowed = @('output', 'release', 'handoff', 'docs/history') | ForEach-Object { [IO.Path]::GetFullPath((Join-Path $leanWorkspace $_)) + [IO.Path]::DirectorySeparatorChar }
$leanProtected = @('handoff/NEXT_CHAT.md', 'docs/history/CHANGELOG-2026-10-24.md', 'output/sites-contest-2026-10-30', 'output/grave-accord-browser-repair-public-02.tar.gz', [string]$leanPlan.latestNativeZip) | ForEach-Object { [IO.Path]::GetFullPath((Join-Path $leanWorkspace $_)) }
$leanProcesses = @(Get-CimInstance Win32_Process)
$leanRemoved = [Collections.Generic.List[object]]::new()
$leanSkipped = [Collections.Generic.List[object]]::new()
$leanFailures = [Collections.Generic.List[object]]::new()
$leanBytes = 0L
$leanBefore = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($leanWorkspace)).AvailableFreeSpace
foreach ($leanItem in $leanPlan.items) {
  $leanTarget = [IO.Path]::GetFullPath((Join-Path $leanWorkspace ([string]$leanItem.path)))
  if ($leanTarget -ne [IO.Path]::GetFullPath([string]$leanItem.absolutePath)) { throw 'Plan absolute path differs' }
  if (-not @($leanAllowed | Where-Object { $leanTarget.StartsWith($_, [StringComparison]::OrdinalIgnoreCase) }).Count) { throw 'Target escaped permitted directories' }
  if (@($leanProtected | Where-Object { $_ -eq $leanTarget -or $_.StartsWith($leanTarget + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) }).Count) { throw 'A current file would be removed' }
  if (-not (Test-Path -LiteralPath $leanTarget)) { $leanSkipped.Add(@{path=$leanItem.path;reason='Already absent'}); continue }
  $leanEntry = Get-Item -LiteralPath $leanTarget -Force
  if ($leanEntry.LinkType -in @('Junction', 'SymbolicLink')) { throw 'Refusing a link target' }
  if (@($leanProcesses | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($leanTarget + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) }).Count) { $leanSkipped.Add(@{path=$leanItem.path;reason='Native app is using this copy'}); continue }
  try {
    if ($leanItem.directory) { Remove-Item -LiteralPath $leanTarget -Recurse -Force -ErrorAction Stop }
    else { Remove-Item -LiteralPath $leanTarget -Force -ErrorAction Stop }
    if (Test-Path -LiteralPath $leanTarget) { throw 'Target remains after deletion' }
    $leanBytes += [long]$leanItem.bytes
    $leanRemoved.Add([ordered]@{path=$leanItem.path;bytes=[long]$leanItem.bytes;files=[int]$leanItem.files;reason=$leanItem.reason})
  } catch { $leanFailures.Add([ordered]@{path=$leanItem.path;error=$_.Exception.Message}) }
}
$leanAfter = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($leanWorkspace)).AvailableFreeSpace
$leanReport = [ordered]@{completedAt=[DateTime]::UtcNow.ToString('o');passed=$leanFailures.Count -eq 0;authorizedBy=$leanPlan.authorizedBy;backedUpCommit=$leanPlan.backupCommit;removedItems=$leanRemoved.Count;logicalBytesRemoved=$leanBytes;driveFreeBytesBefore=$leanBefore;driveFreeBytesAfter=$leanAfter;driveFreeBytesIncrease=$leanAfter-$leanBefore;removed=@($leanRemoved.ToArray());skipped=@($leanSkipped.ToArray());failures=@($leanFailures.ToArray());currentHandoff='handoff/NEXT_CHAT.md';canonicalArtworkPreserved=$true;latestNativeZipVerifiedAndPreserved=$true;canonicalGitHistoryUnchanged=$true}
$leanReportPath = Join-Path $leanScope 'lean-archive-cleanup-result.json'
if (Test-Path -LiteralPath $leanReportPath) { throw 'Preserve the issued result' }
[IO.File]::WriteAllText($leanReportPath,($leanReport | ConvertTo-Json -Depth 7) + "`n",[Text.UTF8Encoding]::new($false))
Write-Output ([ordered]@{passed=$leanReport.passed;removedItems=$leanRemoved.Count;logicalGiBRemoved=[math]::Round($leanBytes/1GB,2);driveFreeGiBIncrease=[math]::Round(($leanAfter-$leanBefore)/1GB,2);failures=$leanFailures.Count} | ConvertTo-Json -Compress)
