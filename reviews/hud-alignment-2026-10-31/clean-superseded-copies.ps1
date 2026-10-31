$ErrorActionPreference='Stop'
$cleanWorkspace=(Get-Location).Path
if(Test-Path -LiteralPath 'reviews/hud-alignment-2026-10-31/storage-cleanup.json'){throw 'This issued cleanup already ran; preserve its receipt'}
$cleanOutput=[IO.Path]::GetFullPath((Join-Path $cleanWorkspace 'output'))+[IO.Path]::DirectorySeparatorChar
$cleanPublication=Get-Content 'reviews/hud-alignment-2026-10-31/publication.json' -Raw|ConvertFrom-Json
if($cleanPublication.site.status -ne 'succeeded' -or $cleanPublication.site.version -ne 4){throw 'Current public version must be saved and deployed first'}
$cleanCurrent=@('testing','public')|ForEach-Object {Get-Content ('reviews/hud-alignment-2026-10-31/preview-'+$_+'.json') -Raw|ConvertFrom-Json}
if(@($cleanCurrent|Where-Object sourceCommit -ne $cleanPublication.gameSourceCommit).Count){throw 'Current previews differ from publication'}
$cleanProtected=@($cleanCurrent.root)+@($cleanCurrent.backend.path)+@([IO.Path]::GetFullPath($cleanPublication.archive.archive))
$cleanNames=@('playtest-browser-fixes-public-8c75bb8-r02','playtest-browser-fixes-testing-8c75bb8-r02','playtest-hud-alignment-2026-10-31-public-c2060bd','playtest-hud-alignment-2026-10-31-testing-c2060bd','playtest-hud-alignment-2026-10-31-public-8e9feb1','playtest-hud-alignment-2026-10-31-testing-8e9feb1')
$cleanNames+=@(Get-ChildItem -LiteralPath $cleanOutput -Directory|Where-Object Name -match '^frozen-'|ForEach-Object Name)
$cleanNames+=@('frozen-hud-alignment-2026-10-31-c2060bd.mjs','frozen-hud-alignment-2026-10-31-8e9feb1.mjs','grave-accord-browser-repair-public-02.tar.gz')
$cleanProcesses=@(Get-CimInstance Win32_Process|Where-Object Name -eq 'node.exe')
$cleanPlan=@();$cleanSkipped=@()
foreach($cleanName in $cleanNames){
 $cleanPath=[IO.Path]::GetFullPath((Join-Path $cleanOutput $cleanName))
 if(-not $cleanPath.StartsWith($cleanOutput,[StringComparison]::OrdinalIgnoreCase) -or $cleanPath -in $cleanProtected){throw 'Unsafe or current cleanup target'}
 if(-not(Test-Path -LiteralPath $cleanPath)){continue}
 $cleanItem=Get-Item -LiteralPath $cleanPath -Force
 $cleanResolved=(Resolve-Path -LiteralPath $cleanPath).Path
 if($cleanResolved -ne $cleanPath -or ($cleanItem.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Cleanup target redirects elsewhere'}
 $cleanChildren=if($cleanItem.PSIsContainer){@(Get-ChildItem -LiteralPath $cleanPath -Recurse -Force)}else{@($cleanItem)}
 if(@($cleanChildren|Where-Object {($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $_.Name -match '\.sqlite(?:-|$|\.)'}).Count){$cleanSkipped+=@{path=$cleanName;reason='Linked or private database content'};continue}
 if(@($cleanProcesses|Where-Object {$_.CommandLine -and ($_.CommandLine.Contains($cleanPath) -or $_.CommandLine.Contains($cleanName))}).Count){$cleanSkipped+=@{path=$cleanName;reason='Referenced by a running process'};continue}
 $cleanRelative=[IO.Path]::GetRelativePath($cleanWorkspace,$cleanPath).Replace('\','/')
 $cleanTracked=@(git -c core.bare=false ls-files -- $cleanRelative)
 if($LASTEXITCODE -ne 0 -or $cleanTracked.Count){throw ('Tracked content in cleanup target '+$cleanName)}
 if($cleanName -like 'frozen-*' -and $cleanItem.PSIsContainer -and @($cleanChildren|Where-Object {-not $_.PSIsContainer -and $_.Extension -ne '.mjs'}).Count){throw 'Unexpected content in old generated backend'}
 if($cleanName -eq 'grave-accord-browser-repair-public-02.tar.gz' -and (Get-FileHash -LiteralPath $cleanPath).Hash.ToLowerInvariant() -ne '16a0c826fcee578b0278f3fbfff07b8f9fb47d80cfdef17ad3e68a7d634a46a4'){throw 'Historical archive identity differs'}
 $cleanFiles=@($cleanChildren|Where-Object {-not $_.PSIsContainer})
 $cleanPlan+=@{path=$cleanPath;relative=$cleanRelative;bytes=[long](($cleanFiles|Measure-Object Length -Sum).Sum);files=$cleanFiles.Count}
}
$cleanDrive=[IO.DriveInfo]::new([IO.Path]::GetPathRoot($cleanWorkspace));$cleanBefore=$cleanDrive.AvailableFreeSpace
foreach($cleanTarget in $cleanPlan){Remove-Item -LiteralPath $cleanTarget.path -Recurse -Force}
$cleanReport=[ordered]@{cleanedAt=[DateTime]::UtcNow.ToString('o');publicVersion=4;sourceCommit=$cleanPublication.gameSourceCommit;removedTargets=$cleanPlan.Count;removedFiles=[long](($cleanPlan|ForEach-Object files|Measure-Object -Sum).Sum);logicalBytesRemoved=[long](($cleanPlan|ForEach-Object bytes|Measure-Object -Sum).Sum);freeBytesBefore=$cleanBefore;freeBytesAfter=$cleanDrive.AvailableFreeSpace;targets=@($cleanPlan|ForEach-Object {@{path=$_.relative;bytes=$_.bytes;files=$_.files}});skipped=$cleanSkipped;preserved='Current testing/public builds, current public archive, current native ZIP, original assets, source, Git history and private databases.'}
[IO.File]::WriteAllText((Join-Path $cleanWorkspace 'reviews/hud-alignment-2026-10-31/storage-cleanup.json'),($cleanReport|ConvertTo-Json -Depth 6)+"`n",[Text.UTF8Encoding]::new($false))
Write-Output ([pscustomobject]$cleanReport|Select-Object removedTargets,removedFiles,logicalBytesRemoved,freeBytesBefore,freeBytesAfter|ConvertTo-Json -Compress)
