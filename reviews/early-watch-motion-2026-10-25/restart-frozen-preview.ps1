$ErrorActionPreference='Stop'
$repo='C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)'
$task='C:\Users\yigal\Documents\Codex\2026-10-23\can-you-continue-with-the-development'
$frozenRoot=Join-Path $task 'work\playtest-brutal-signals-f1766fe'
if(-not(Test-Path -LiteralPath $frozenRoot)){throw 'Expected preserved frozen root is absent'}
if(Get-NetTCPConnection -LocalPort 5178 -State Listen -ErrorAction SilentlyContinue){throw 'Port 5178 is occupied; preserve the current process'}
& python -X utf8 (Join-Path $task 'work\phase-feedback\verify-frozen.py')
if($LASTEXITCODE -ne 0){throw 'Preserved frozen bytes differ from the issued artifact'}
$nodeExe='C:\Users\yigal\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$viteScript=Join-Path $repo 'node_modules\vite\bin\vite.js'
$previewArgs=@(('"'+$viteScript+'"'),'preview','--host','127.0.0.1','--port','5178','--strictPort','--outDir',('"'+$frozenRoot+'"'))
$previewProcess=Start-Process -FilePath $nodeExe -ArgumentList $previewArgs -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput (Join-Path $task 'work\early-watch\frozen-preview-restart.stdout.log') -RedirectStandardError (Join-Path $task 'work\early-watch\frozen-preview-restart.stderr.log') -PassThru
@{url='http://127.0.0.1:5178/';pid=$previewProcess.Id;buildId='2026.10.25-brutal-signals';source='f1766fe9c41184df44c15902533aff0e2fd7ef2c';root=$frozenRoot;reason='Previous process was absent and HTTP was unavailable; exact preserved artifact verified before restart.'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $task 'work\early-watch\frozen-preview-restart.json') -Encoding utf8
Write-Output ('Restarted exact frozen preview PID '+$previewProcess.Id)
