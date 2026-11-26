param(
  [Parameter(Mandatory=$true)][string]$PackagePath,
  [Parameter(Mandatory=$true)][ValidateSet('smoke','lan')][string]$Kind,
  [Parameter(Mandatory=$true)][string]$Label
)
$ErrorActionPreference = 'Stop'
if ($Label -notmatch '^[a-z0-9-]+$') { throw 'Use a simple unique review label' }
$workspace = (Get-Location).Path
$package = [IO.Path]::GetFullPath($PackagePath)
$executable = Join-Path $package 'Grave Accord.exe'
if (-not (Test-Path -LiteralPath $executable)) { throw 'Packaged executable missing' }
$report = Join-Path $workspace ('reviews/windows-profile-navigation-2026-10-30/native-' + $Label + '-' + $Kind + '.json')
$fixtureProfile = Join-Path $workspace ('output/windows-profile-navigation-2026-10-30/profile-' + $Label + '-' + $Kind)
if ((Test-Path -LiteralPath $report) -or (Test-Path -LiteralPath $fixtureProfile)) { throw 'Preserve existing report/profile; choose a new label' }
$reportArg = if ($Kind -eq 'smoke') { '--smoke-report="' + $report + '"' } else { '--lan-report="' + $report + '"' }
$profileArg = '--profile-dir="' + $fixtureProfile + '"'
$child = Start-Process -FilePath $executable -ArgumentList @($reportArg, $profileArg) -WorkingDirectory $package -WindowStyle Hidden -PassThru -RedirectStandardOutput ('output/windows-profile-navigation-2026-10-30/' + $Label + '-' + $Kind + '.stdout.log') -RedirectStandardError ('output/windows-profile-navigation-2026-10-30/' + $Label + '-' + $Kind + '.stderr.log')
Write-Output ('Running packaged ' + $Kind + ' fixture; PID ' + $child.Id)
$child.WaitForExit()
if (-not (Test-Path -LiteralPath $report)) { throw ('Native fixture exited without a report: ' + $child.ExitCode) }
$value = Get-Content -LiteralPath $report -Raw | ConvertFrom-Json
if ($child.ExitCode -ne 0 -or $value.passed -ne $true) { Get-Content -LiteralPath $report; throw 'Native package fixture failed' }
if ($value.protocol -ne 43 -or $value.audience -ne 'public') { throw 'Unexpected native protocol/audience' }
if ($Kind -eq 'smoke' -and $value.startingShieldCases -ne 210) { throw 'Native starting shields were not verified in every start' }
if ($Kind -eq 'lan') { foreach ($check in @('protectedRoomCodeJoined','wrongPasswordRejected','passwordAbsentFromListing','hostStartRequired','chatServerConfirmed','duplicateChatSuppressed')) { if ($value.$check -ne $true) { throw ('Native room check missing: ' + $check) } } }
Write-Output ($value | ConvertTo-Json -Depth 7 -Compress)
