[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$CurrentScope,
 [Parameter(Mandatory=$true)][string]$RollbackScope,
 [Parameter(Mandatory=$true)][string]$ReceiptScope
)
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
foreach($taskScope in @($CurrentScope,$RollbackScope,$ReceiptScope)){if($taskScope -notmatch '^reviews/[a-z0-9-]+$'){throw 'Invalid receipt scope.'}}
$taskCurrent=Get-Content -LiteralPath (Join-Path $taskRepo ($CurrentScope+'/preview-testing.json')) -Raw|ConvertFrom-Json
$taskNative=Get-Content -LiteralPath (Join-Path $taskRepo ($CurrentScope+'/frozen-verification.json')) -Raw|ConvertFrom-Json
$taskCI=Get-Content -LiteralPath (Join-Path $taskRepo ($CurrentScope+'/source-ci.json')) -Raw|ConvertFrom-Json
$taskRollback=Get-Content -LiteralPath (Join-Path $taskRepo ($RollbackScope+'/frozen-verification.json')) -Raw|ConvertFrom-Json
if(!$taskNative.passed -or $taskNative.sourceCommit -cne $taskCurrent.sourceCommit -or !$taskCI.passed -or $taskCI.head -cne $taskCurrent.sourceCommit -or !$taskRollback.passed){throw 'Automatic promotion requires the new complete native review, exact-source CI and a verified rollback checkpoint.'}
$taskPython=Join-Path $PSScriptRoot 'review-retention.py'
$taskPlan=Join-Path $taskRepo ($ReceiptScope+'/retention-plan.json')
& python $taskPython plan --repo $taskRepo --current-scope $CurrentScope --rollback-scope $RollbackScope --receipt-scope $ReceiptScope
if($LASTEXITCODE){throw 'Retention planning failed; inspect partial receipts.'}
& python $taskPython archive --plan $taskPlan
if($LASTEXITCODE){throw 'Rollback archive failed; preserve original roots.'}
& python $taskPython verify --repo $taskRepo --receipt (Join-Path $taskRepo ($ReceiptScope+'/rollback-archive.json')) --restore-check
if($LASTEXITCODE){throw 'Rollback restore failed; preserve original roots.'}
& (Join-Path $PSScriptRoot 'capture-retention-processes.ps1') -PlanPath $taskPlan
& (Join-Path $PSScriptRoot 'apply-review-retention.ps1') -PlanPath $taskPlan
