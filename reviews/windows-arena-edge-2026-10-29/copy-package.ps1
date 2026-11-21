$ErrorActionPreference='Stop'
$workspace=[IO.Path]::GetFullPath((Get-Location).Path)
$packageName='Grave-Accord-2026.10.29-arena-edge-polish-public-win32-x64'
$source=[IO.Path]::GetFullPath((Join-Path $workspace ('release/'+$packageName)))
$destinationParent=[IO.Path]::GetFullPath((Join-Path $workspace 'output/windows-arena-edge-2026-10-29/ordinary-deep-copy-日本語'))
$target=Join-Path $destinationParent $packageName
$report=Join-Path $workspace 'reviews/windows-arena-edge-2026-10-29/package-copy-command.json'
$prefix=$workspace+[IO.Path]::DirectorySeparatorChar
foreach($path in @($source,$destinationParent,$target,$report)){if(-not $path.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Package operation would leave the intended workspace'}}
if(-not(Test-Path -LiteralPath (Join-Path $source 'BUILD-MANIFEST.json'))){throw 'Verified source package is missing'}
if((Test-Path -LiteralPath $destinationParent)-or(Test-Path -LiteralPath $report)){throw 'Preserve the earlier copy or report; choose a fresh attempt'}
$started=[DateTime]::UtcNow.ToString('o')
New-Item -ItemType Directory -Path $destinationParent | Out-Null
Copy-Item -LiteralPath $source -Destination $destinationParent -Recurse
$value=[ordered]@{method='PowerShell Copy-Item -LiteralPath source -Destination parent -Recurse';source=$source;destination=$target;startedAt=$started;finishedAt=[DateTime]::UtcNow.ToString('o');nonEnglishDestination=$true;byteVerificationPending=$true}
[IO.File]::WriteAllText($report,($value|ConvertTo-Json -Depth 3)+"`n",[Text.UTF8Encoding]::new($false))
& python tools/verify-desktop-package.py $target --verification reviews/arena-edge-2026-10-29/gate-04/runtime-verification.json --report reviews/windows-arena-edge-2026-10-29/package-ordinary-copy.json
if($LASTEXITCODE -ne 0){throw 'Independent Windows copy did not match the package manifest'}
