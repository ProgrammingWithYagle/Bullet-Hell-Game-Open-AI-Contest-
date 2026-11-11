[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$PlanPath,[switch]$ValidateOnly)
$ErrorActionPreference='Stop'
$taskPlanFile=(Resolve-Path -LiteralPath $PlanPath).Path
$taskScope=Split-Path -Parent $taskPlanFile
$taskPlan=Get-Content -LiteralPath $taskPlanFile -Raw|ConvertFrom-Json
$taskRepo=[IO.Path]::GetFullPath($taskPlan.repo)
$taskOutput=[IO.Path]::GetFullPath((Join-Path $taskRepo 'output'))
$taskProof=Get-Content -LiteralPath (Join-Path $taskScope 'rollback-archive.json') -Raw|ConvertFrom-Json
$taskRestore=Get-Content -LiteralPath (Join-Path $taskScope 'rollback-restore-check.json') -Raw|ConvertFrom-Json
$taskProcesses=Get-Content -LiteralPath (Join-Path $taskScope 'processes-before-retirement.json') -Raw|ConvertFrom-Json
if(!$taskPlan.authorizedByUser -or !$taskPlan.sourceAssetsReviewsReleaseAndPrivateDatabasesExcluded -or !$taskProof.passed -or !$taskRestore.passed -or !$taskRestore.allRestoredMemberBytesExact){throw 'Missing authorized plan or complete rollback archive/restore verification.'}
if($taskProcesses.blockers.Count -or $taskProcesses.planSha256 -cne (Get-FileHash -LiteralPath $taskPlanFile -Algorithm SHA256).Hash.ToLowerInvariant()){throw 'Process observation has blockers or does not bind this plan.'}
if($taskPlan.keep.Count -ne 2){throw 'Exactly one expanded current pair must be kept.'}
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Linq;
using System.Collections.Generic;
using System.Security.Cryptography;
public sealed class ReviewTreeSnapshot {
 public long Files {get;set;} public long Bytes {get;set;} public string Sha256 {get;set;}
 public static ReviewTreeSnapshot Read(string root) {
  var info=new DirectoryInfo(root);
  if((info.Attributes&FileAttributes.ReparsePoint)!=0)throw new InvalidOperationException("Reparse root");
  var rows=new SortedDictionary<string,string>(StringComparer.Ordinal);long bytes=0;
  Action<DirectoryInfo> visit=null;
  visit=dir=>{foreach(var item in dir.EnumerateFileSystemInfos()){
   if((item.Attributes&FileAttributes.ReparsePoint)!=0)throw new InvalidOperationException("Reparse entry: "+item.FullName);
   if(item is DirectoryInfo child){visit(child);continue;}
   if(!(item is FileInfo file))throw new InvalidOperationException("Nonregular entry");
   var name=file.Name.ToLowerInvariant();if(name.Contains(".sqlite")||System.Text.RegularExpressions.Regex.IsMatch(name,@"\.db(?:-|$)"))throw new InvalidOperationException("Private database inside removal tree");
   var relative=Path.GetRelativePath(root,file.FullName).Replace('\\','/');
   rows.Add(relative,relative+"\0"+file.Length.ToString(System.Globalization.CultureInfo.InvariantCulture)+"\0"+file.LastWriteTimeUtc.Ticks.ToString(System.Globalization.CultureInfo.InvariantCulture)+"\n");bytes+=file.Length;
  }};visit(info);
  using(var sha=SHA256.Create()){
   var hash=sha.ComputeHash(Encoding.UTF8.GetBytes(String.Concat(rows.Values)));
   return new ReviewTreeSnapshot{Files=rows.Count,Bytes=bytes,Sha256=Convert.ToHexString(hash).ToLowerInvariant()};
  }
 }
}
'@
function Get-ScopedReviewPath([string]$Relative,[string]$Kind){
 $taskPath=[IO.Path]::GetFullPath((Join-Path $taskRepo $Relative))
 if([IO.Path]::GetDirectoryName($taskPath) -cne $taskOutput){throw 'Removal target escaped the exact output directory.'}
 $taskName=[IO.Path]::GetFileName($taskPath)
 if($Kind -eq 'directory' -and $taskName -notmatch '^playtest-[a-z0-9-]+$'){throw 'Not a frozen preview directory.'}
 if($Kind -eq 'backend' -and $taskName -notmatch '^frozen-[a-z0-9-]+\.mjs$'){throw 'Not a frozen backend file.'}
 if((Get-Item -LiteralPath $taskPath -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refuse reparse target.'}
 return $taskPath
}
$taskKeep=@($taskPlan.keep|ForEach-Object {[IO.Path]::GetFullPath((Join-Path $taskRepo $_.path))})
$taskTargets=@();$taskChecked=0
foreach($taskRow in $taskPlan.retireDirectories){
 $taskPath=Get-ScopedReviewPath $taskRow.path 'directory'
 if($taskKeep -contains $taskPath){throw 'Current preview entered the deletion list.'}
 $taskActual=[ReviewTreeSnapshot]::Read($taskPath)
 if($taskActual.Files -ne $taskRow.files -or $taskActual.Bytes -ne $taskRow.bytes -or $taskActual.Sha256 -cne $taskRow.treeStatSha256){throw ('Preview changed after planning: '+$taskRow.path)}
 $taskTargets += $taskPath;$taskChecked++
 if($taskChecked%20 -eq 0){Write-Output ('Validated '+$taskChecked+' retired preview trees.')}
}
foreach($taskRow in $taskPlan.retireBackends){
 $taskPath=Get-ScopedReviewPath $taskRow.path 'backend'
 if($taskPlan.keepBackendPaths -contains $taskRow.path){throw 'Current backend entered removal list.'}
 if((Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskRow.sha256){throw 'Retired backend differs.'}
}
$taskCandidate=[IO.Path]::GetFullPath((Join-Path $taskRepo $taskProof.candidateArchive))
$taskArchive=[IO.Path]::GetFullPath((Join-Path $taskRepo $taskProof.finalArchive))
if($taskCandidate -cne (Join-Path $taskOutput 'review-rollback.next.zip') -or $taskArchive -cne (Join-Path $taskOutput 'review-rollback.zip')){throw 'Archive path differs.'}
if((Get-FileHash -LiteralPath $taskCandidate -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskProof.archiveSha256 -or $taskRestore.archiveSha256 -cne $taskProof.archiveSha256){throw 'Rollback archive binding differs.'}
if(Test-Path -LiteralPath $taskArchive){if(!$taskPlan.previousArchiveSha256 -or (Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskPlan.previousArchiveSha256){throw 'Previous archive differs.'}}
$taskScratch=[IO.Path]::GetFullPath($taskRestore.destination)
if($taskScratch -cne (Join-Path $taskOutput 'retention-restore-check') -or !(Test-Path -LiteralPath $taskScratch)){throw 'Unexpected restore-check tree.'}
if((Get-Item -LiteralPath $taskScratch).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Restore-check target is a reparse point.'}
if($ValidateOnly){Write-Output ('Validated '+$taskTargets.Count+' retired roots and the complete restored rollback archive. No processes or files changed.');return}
$taskListeners=@(Get-NetTCPConnection -State Listen)
foreach($taskKept in $taskProcesses.keep){
 $taskLive=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$taskKept.pid)
 if(!$taskLive -or $taskLive.CommandLine -cne $taskKept.commandLine -or [DateTimeOffset]$taskLive.CreationDate -ne [DateTimeOffset]$taskKept.createdAt -or !($taskListeners|Where-Object {$_.OwningProcess -eq $taskKept.pid -and $_.LocalPort -eq $taskKept.port})){throw 'Current exact service/listener changed before cleanup.'}
}
$taskJournal=Join-Path $taskScope 'retention-progress.jsonl'
function Write-RetentionEvent($Value){[IO.File]::AppendAllText($taskJournal,($Value|ConvertTo-Json -Compress -Depth 5)+"`n",[Text.UTF8Encoding]::new($false))}
$taskStopped=@();$taskAlreadyAbsent=@()
foreach($taskOld in $taskProcesses.retire){
 if($taskProcesses.keep.pid -contains [int]$taskOld.pid){throw 'Current service is protected.'}
 $taskLive=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$taskOld.pid)
 if(!$taskLive){$taskAlreadyAbsent += [int]$taskOld.pid;continue}
 if($taskLive.CommandLine -cne $taskOld.commandLine -or [DateTimeOffset]$taskLive.CreationDate -ne [DateTimeOffset]$taskOld.createdAt){throw 'A retirement PID changed identity; do not stop it.'}
 foreach($taskPort in $taskOld.listeningPorts){if(!($taskListeners|Where-Object {$_.OwningProcess -eq $taskOld.pid -and $_.LocalPort -eq $taskPort})){throw 'An old listener changed after capture; inspect it.'}}
 Stop-Process -Id ([int]$taskOld.pid) -Force -Confirm:$false
 $taskStopped += $taskOld
 Write-RetentionEvent @{action='stopped verified old preview';at=[DateTime]::UtcNow.ToString('o');pid=[int]$taskOld.pid;createdAt=$taskOld.createdAt;retiredPath=$taskOld.retiredPath}
}
foreach($taskOld in $taskStopped){$taskLive=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$taskOld.pid);if($taskLive -and $taskLive.CommandLine -ceq $taskOld.commandLine -and [DateTimeOffset]$taskLive.CreationDate -eq [DateTimeOffset]$taskOld.createdAt){throw 'An exact old process remains; do not delete its files.'}}
Move-Item -LiteralPath $taskCandidate -Destination $taskArchive -Force
if((Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskProof.archiveSha256){throw 'Promoted rollback differs.'}
$taskDeleted=@()
foreach($taskPath in $taskTargets){
 # Recheck the exact absolute boundary immediately before each recursive delete.
 if([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($taskPath)) -cne $taskOutput -or $taskKeep -contains $taskPath -or (Get-Item -LiteralPath $taskPath).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Unsafe removal target.'}
 Remove-Item -LiteralPath $taskPath -Recurse -Force
 $taskDeleted += [IO.Path]::GetRelativePath($taskRepo,$taskPath).Replace('\','/')
 Write-RetentionEvent @{action='removed obsolete expanded build';at=[DateTime]::UtcNow.ToString('o');path=$taskDeleted[-1]}
 if($taskDeleted.Count%20 -eq 0){Write-Output ('Removed '+$taskDeleted.Count+' obsolete expanded builds.')}
}
foreach($taskRow in $taskPlan.retireBackends){$taskPath=Get-ScopedReviewPath $taskRow.path 'backend';if((Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskRow.sha256){throw 'Backend changed before removal.'};Remove-Item -LiteralPath $taskPath -Force}
Remove-Item -LiteralPath $taskScratch -Recurse -Force
$taskRemaining=@(Get-ChildItem -LiteralPath $taskOutput -Directory -Filter 'playtest-*'|ForEach-Object {$_.FullName})
if($taskRemaining.Count -ne 2 -or @($taskRemaining|Where-Object {$taskKeep -notcontains $_}).Count){throw 'Unexpected remaining expanded preview roots.'}
$taskFinalListeners=@(Get-NetTCPConnection -State Listen)
foreach($taskKept in $taskProcesses.keep){$taskLive=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$taskKept.pid);if(!$taskLive -or $taskLive.CommandLine -cne $taskKept.commandLine -or [DateTimeOffset]$taskLive.CreationDate -ne [DateTimeOffset]$taskKept.createdAt -or !($taskFinalListeners|Where-Object {$_.OwningProcess -eq $taskKept.pid -and $_.LocalPort -eq $taskKept.port})){throw 'Current service changed; preserve the resulting evidence.'}}
$taskState=[ordered]@{schemaVersion=1;updatedAt=[DateTime]::UtcNow.ToString('o');currentScope=$taskPlan.currentScope;currentSourceCommit=$taskPlan.currentSourceCommit;currentRoots=$taskPlan.keep.path;rollbackScope=$taskPlan.rollbackScope;rollbackSourceCommit=$taskPlan.rollbackSourceCommit;rollbackArchive=$taskProof.finalArchive;rollbackArchiveSha256=$taskProof.archiveSha256;policy='One current expanded testing/public pair and one verified rollback archive. Original receipts and private SQLite remain. Older full copies are explicitly retired.';retirementReceipt=[IO.Path]::GetRelativePath($taskRepo,(Join-Path $taskScope 'retention-result.json')).Replace('\','/');originalHistoricalReceiptsAreNotCurrentAvailabilityClaims=$true}
[IO.File]::WriteAllText((Join-Path $taskOutput 'review-retention.json'),($taskState|ConvertTo-Json -Depth 5)+"`n",[Text.UTF8Encoding]::new($false))
[ordered]@{passed=$true;finishedAt=[DateTime]::UtcNow.ToString('o');currentScope=$taskPlan.currentScope;currentSourceCommit=$taskPlan.currentSourceCommit;currentFourExactServicesAndListenersKept=$true;stoppedOlderExactProcesses=$taskStopped;olderAlreadyAbsent=$taskAlreadyAbsent;removedDirectories=$taskDeleted;removedDirectoryCount=$taskDeleted.Count;removedBackendCount=$taskPlan.retireBackends.Count;removedLogicalBuildBytes=$taskPlan.retireFileBytes;rollbackArchive=$taskProof.finalArchive;rollbackArchiveSha256=$taskProof.archiveSha256;rollbackArchiveBytes=$taskProof.archiveBytes;rollbackFullyRestoredAndHashVerified=$true;onlyTwoExpandedPreviewRootsRemain=$true;sourceAssetsReviewReceiptsReleaseAndPrivateDatabasesExcluded=$true;priorPreserveEveryFrozenRootRuleSupersededByUser=$true}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $taskScope 'retention-result.json') -Encoding utf8NoBOM
Write-Output ('Retired '+$taskStopped.Count+' exact older preview services and removed '+$taskDeleted.Count+' obsolete build folders. Current pair and verified rollback retained.')
