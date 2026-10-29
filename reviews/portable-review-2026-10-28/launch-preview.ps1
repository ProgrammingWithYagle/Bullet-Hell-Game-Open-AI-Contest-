param([Parameter(Mandatory=$true)][ValidateSet('testing','public')][string]$Audience)
$ErrorActionPreference = 'Stop'
$review = 'reviews/portable-review-2026-10-28'
$manifest = Get-Content -LiteralPath ($review + '/preview-' + $Audience + '-bytes.json') -Raw | ConvertFrom-Json
$clientPort = if ($Audience -eq 'testing') { 5220 } else { 5221 }
$serverPort = if ($Audience -eq 'testing') { 2594 } else { 2595 }
$ports = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | ForEach-Object { $_.Port }
if ($clientPort -in $ports -or $serverPort -in $ports) { throw 'A new review port is already owned; inspect it before launching.' }
if ($manifest.audience -ne $Audience -or $manifest.url -ne ('http://127.0.0.1:' + $clientPort + '/') -or $manifest.endpoint -ne ('http://127.0.0.1:' + $serverPort)) { throw 'Unexpected preview identity' }
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
  $env:PORT = [string]$serverPort; $env:HOST = '127.0.0.1'
  $env:CLIENT_ORIGINS = 'http://127.0.0.1:' + $clientPort
  $env:RENDER_GIT_COMMIT = $manifest.sourceCommit
  $env:GRAVE_TESTING_SERVER = if ($Audience -eq 'testing') { '1' } else { '0' }
  $serverArgument = '"' + $manifest.backend.path + '"'
  $backend = Start-Process -FilePath $node -ArgumentList @($serverArgument) -WorkingDirectory $workspace -WindowStyle Hidden -PassThru -RedirectStandardOutput ('output/portable-review-2026-10-28/' + $Audience + '-server.stdout.log') -RedirectStandardError ('output/portable-review-2026-10-28/' + $Audience + '-server.stderr.log')
  $client = Start-Process -FilePath $node -ArgumentList @('node_modules/vite/bin/vite.js', 'preview', '--outDir', $relativeRoot, '--host', '127.0.0.1', '--port', [string]$clientPort, '--strictPort') -WorkingDirectory $workspace -WindowStyle Hidden -PassThru -RedirectStandardOutput ('output/portable-review-2026-10-28/' + $Audience + '-client.stdout.log') -RedirectStandardError ('output/portable-review-2026-10-28/' + $Audience + '-client.stderr.log')
} finally {
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
}
$report = [ordered]@{
  createdAt = [DateTime]::UtcNow.ToString('o'); sourceCommit = $manifest.sourceCommit; protocol = 38; audience = $Audience
  launcherPid = $PID; node = $node
  backend = [ordered]@{ pid = $backend.Id; startedAt = $backend.StartTime.ToUniversalTime().ToString('o'); script = $manifest.backend.path; sha256 = $backendHash; port = $serverPort }
  client = [ordered]@{ pid = $client.Id; startedAt = $client.StartTime.ToUniversalTime().ToString('o'); root = $manifest.root; port = $clientPort; command = 'vite preview --outDir ' + $relativeRoot + ' --host 127.0.0.1 --port ' + $clientPort + ' --strictPort' }
}
$json = $report | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText((Join-Path $workspace ($review + '/preview-' + $Audience + '-processes.json')), $json + "`n", [Text.UTF8Encoding]::new($false))
Write-Output $json
Wait-Process -Id $backend.Id, $client.Id
