param([Parameter(Mandatory=$true)][string]$PlanPath)
$ErrorActionPreference='Stop'
$taskPlanFile=(Resolve-Path -LiteralPath $PlanPath).Path
$taskPlan=Get-Content -LiteralPath $taskPlanFile -Raw|ConvertFrom-Json
$taskRepo=[IO.Path]::GetFullPath($taskPlan.repo)
$taskCurrentRecord=Get-Content -LiteralPath (Join-Path $taskRepo ($taskPlan.currentScope+'/process-identities.json')) -Raw|ConvertFrom-Json
$taskAll=@{};foreach($taskProcess in (Get-CimInstance Win32_Process)){$taskAll[[int]$taskProcess.ProcessId]=$taskProcess}
$taskListeners=@(Get-NetTCPConnection -State Listen)
$taskKept=@();$taskRetired=@();$taskBlockers=@()
foreach($taskExpected in $taskCurrentRecord.identities){
 $taskLive=$taskAll[[int]$taskExpected.pid]
 $taskSame=$taskLive -and $taskLive.CommandLine -ceq $taskExpected.commandLine -and [DateTimeOffset]$taskLive.CreationDate -eq [DateTimeOffset]$taskExpected.createdAt
 $taskOwned=$taskSame -and [bool]($taskListeners|Where-Object {$_.LocalPort -eq $taskExpected.port -and $_.OwningProcess -eq $taskExpected.pid})
 if(!$taskSame -or !$taskOwned){throw 'Current exact service identity/listener differs; do not clean up.'}
 $taskKept += [ordered]@{pid=[int]$taskExpected.pid;port=[int]$taskExpected.port;createdAt=$taskLive.CreationDate.ToUniversalTime().ToString('o');commandLine=$taskLive.CommandLine;exactIdentityAndListenerVerified=$true}
}
if($taskKept.Count -ne 4){throw 'Expected four current services.'}
$taskRecorded=@($taskCurrentRecord.identities)+@($taskCurrentRecord.olderRecordedIdentities)
foreach($taskLive in $taskAll.Values){
 if($taskLive.Name -ine 'node.exe' -or !$taskLive.CommandLine -or $taskKept.pid -contains [int]$taskLive.ProcessId){continue}
 $taskCommand=$taskLive.CommandLine.Replace('\','/')
 $taskMatched=$null;$taskRole=$null;$taskAbsoluteEvidence=$false
 foreach($taskFile in $taskPlan.retireBackends){$taskFull=(Join-Path $taskRepo $taskFile.path).Replace('\','/');if($taskCommand.Contains($taskFull,[StringComparison]::OrdinalIgnoreCase)){$taskMatched=$taskFile.path;$taskRole='backend';$taskAbsoluteEvidence=$true;break}}
 if(!$taskMatched -and $taskCommand.Contains('vite/bin/vite.js') -and $taskCommand.Contains(' preview ') -and $taskCommand.Contains('--outDir ')){
  foreach($taskDirectory in $taskPlan.retireDirectories){$taskRelative=$taskDirectory.path.Replace('\','/');if($taskCommand.Contains($taskRelative+' ',[StringComparison]::OrdinalIgnoreCase) -or $taskCommand.Contains($taskRelative+'" ',[StringComparison]::OrdinalIgnoreCase)){$taskMatched=$taskDirectory.path;$taskRole='client';break}}
 }
 if(!$taskMatched){continue}
 $taskRecordedMatch=@($taskRecorded|Where-Object {$_.pid -eq $taskLive.ProcessId -and $_.commandLine -ceq $taskLive.CommandLine -and [DateTimeOffset]$_.createdAt -eq [DateTimeOffset]$taskLive.CreationDate}).Count -eq 1
 $taskParent=$taskAll[[int]$taskLive.ParentProcessId]
 $taskParentProof=$taskParent -and $taskParent.CommandLine -and $taskParent.CommandLine.Contains((Join-Path $taskRepo 'tools\launch-review.ps1'),[StringComparison]::OrdinalIgnoreCase)
 if(!$taskRecordedMatch -and !$taskAbsoluteEvidence -and !$taskParentProof){$taskBlockers += [ordered]@{pid=[int]$taskLive.ProcessId;matchedRetiredPath=$taskMatched;reason='Relative preview path lacks a recorded identity or exact project-launcher parent.'};continue}
 $taskOwned=@($taskListeners|Where-Object {$_.OwningProcess -eq $taskLive.ProcessId}|Select-Object -ExpandProperty LocalPort -Unique)
 $taskRetired += [ordered]@{pid=[int]$taskLive.ProcessId;role=$taskRole;createdAt=$taskLive.CreationDate.ToUniversalTime().ToString('o');commandLine=$taskLive.CommandLine;retiredPath=$taskMatched;listeningPorts=$taskOwned;recordedExactIdentityMatched=[bool]$taskRecordedMatch;absoluteProjectPathVerified=[bool]$taskAbsoluteEvidence;projectLauncherParentVerified=[bool]$taskParentProof;parentPid=[int]$taskLive.ParentProcessId}
}
$taskOutput=Join-Path (Split-Path -Parent $taskPlanFile) 'processes-before-retirement.json'
if(Test-Path -LiteralPath $taskOutput){throw 'Preserve earlier process observation.'}
[ordered]@{capturedAt=[DateTime]::UtcNow.ToString('o');planSha256=(Get-FileHash -LiteralPath $taskPlanFile -Algorithm SHA256).Hash.ToLowerInvariant();keep=$taskKept;retire=$taskRetired;retireCount=$taskRetired.Count;blockers=$taskBlockers;noProcessesStoppedYet=$true;onlyRecordedGameCommandsDisclosed=$true}|ConvertTo-Json -Depth 7|Set-Content -LiteralPath $taskOutput -Encoding utf8NoBOM
if($taskBlockers.Count){throw 'Inspect process blockers before retirement or deletion.'}
Write-Output ('Verified '+$taskKept.Count+' current services to keep; '+$taskRetired.Count+' exact older preview services eligible for retirement.')
