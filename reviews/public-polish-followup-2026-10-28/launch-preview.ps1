$ErrorActionPreference = 'Stop'
$manifest = Get-Content -LiteralPath 'reviews/public-polish-followup-2026-10-28/preview-public-bytes.json' -Raw | ConvertFrom-Json
$ports = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | ForEach-Object { $_.Port }
if (5215 -in $ports -or 2589 -in $ports) { throw 'A new review port is already owned; inspect it before launching.' }
if ($manifest.url -ne 'http://127.0.0.1:5215/' -or $manifest.endpoint -ne 'http://127.0.0.1:2589') { throw 'Unexpected preview endpoints' }
$node = (Get-Command node).Source
$workspace = (Get-Location).Path
$backendHash = (Get-FileHash -LiteralPath $manifest.backend.path -Algorithm SHA256).Hash.ToLowerInvariant()
if ($backendHash -ne $manifest.backend.sha256) { throw 'Frozen backend hash differs' }
$source = (& git -c core.bare=false rev-parse HEAD).Trim()
if ($source -ne $manifest.sourceCommit) { throw 'HEAD no longer matches the frozen source' }
$relativeRoot = [IO.Path]::GetRelativePath($workspace, $manifest.root)
$names = @('PORT', 'HOST', 'CLIENT_ORIGINS', 'RENDER_GIT_COMMIT', 'GRAVE_TESTING_SERVER')
$saved = @{}
foreach ($name in $names) { $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  $env:PORT = '2589'; $env:HOST = '127.0.0.1'
  $env:CLIENT_ORIGINS = 'http://127.0.0.1:5215'
  $env:RENDER_GIT_COMMIT = $manifest.sourceCommit; $env:GRAVE_TESTING_SERVER = '0'
  $serverArgument = '"' + $manifest.backend.path + '"'
  $backend = Start-Process -FilePath $node -ArgumentList @($serverArgument) -WorkingDirectory $workspace -WindowStyle Hidden -PassThru -RedirectStandardOutput 'output/public-polish-followup-2026-10-28/server.stdout.log' -RedirectStandardError 'output/public-polish-followup-2026-10-28/server.stderr.log'
  $client = Start-Process -FilePath $node -ArgumentList @('node_modules/vite/bin/vite.js', 'preview', '--outDir', $relativeRoot, '--host', '127.0.0.1', '--port', '5215', '--strictPort') -WorkingDirectory $workspace -WindowStyle Hidden -PassThru -RedirectStandardOutput 'output/public-polish-followup-2026-10-28/client.stdout.log' -RedirectStandardError 'output/public-polish-followup-2026-10-28/client.stderr.log'
} finally {
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
}
$report = [ordered]@{
  createdAt = [DateTime]::UtcNow.ToString('o'); sourceCommit = $manifest.sourceCommit; protocol = 38; audience = 'public'
  launcherPid = $PID; node = $node
  backend = [ordered]@{ pid = $backend.Id; startedAt = $backend.StartTime.ToUniversalTime().ToString('o'); script = $manifest.backend.path; sha256 = $backendHash; port = 2589 }
  client = [ordered]@{ pid = $client.Id; startedAt = $client.StartTime.ToUniversalTime().ToString('o'); root = $manifest.root; port = 5215; command = 'vite preview --outDir ' + $relativeRoot + ' --host 127.0.0.1 --port 5215 --strictPort' }
}
$json = $report | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText((Join-Path $workspace 'reviews/public-polish-followup-2026-10-28/preview-processes.json'), $json + "`n", [Text.UTF8Encoding]::new($false))
Write-Output $json
Wait-Process -Id $backend.Id, $client.Id
