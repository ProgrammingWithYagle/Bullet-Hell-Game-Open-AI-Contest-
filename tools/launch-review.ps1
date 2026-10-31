param([Parameter(Mandatory=$true)][ValidateSet('testing','public')][string]$Audience,[Parameter(Mandatory=$true)][string]$Scope)
$ErrorActionPreference='Stop'
if ($Scope -notmatch '^reviews/[a-z0-9-]+$') { throw 'Invalid review scope' }
$launchRoot=(Get-Location).Path
$launchManifest=Get-Content -LiteralPath ($Scope+'/preview-'+$Audience+'.json') -Raw | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $launchManifest.manifestPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $launchManifest.manifestSha256) { throw 'Frozen manifest differs' }
if ((Get-FileHash -LiteralPath $launchManifest.backend.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $launchManifest.backend.sha256) { throw 'Frozen backend differs' }
$launchClientPort=([Uri]$launchManifest.url).Port;$launchServerPort=([Uri]$launchManifest.endpoint).Port
$launchPorts=@([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | ForEach-Object {$_.Port})
if ($launchClientPort -in $launchPorts -or $launchServerPort -in $launchPorts) { throw 'A review port is already in use' }
$launchLabel=Split-Path $Scope -Leaf
$launchSaved=@{}
foreach($launchName in @('PORT','HOST','CLIENT_ORIGINS','RENDER_GIT_COMMIT','GRAVE_TESTING_SERVER','GRAVE_RECORDS_DB')){$launchSaved[$launchName]=[Environment]::GetEnvironmentVariable($launchName,'Process')}
try {
 $env:PORT=[string]$launchServerPort;$env:HOST='127.0.0.1';$env:CLIENT_ORIGINS=$launchManifest.url.TrimEnd('/');$env:RENDER_GIT_COMMIT=$launchManifest.sourceCommit
 $env:GRAVE_TESTING_SERVER=if($Audience -eq 'testing'){'1'}else{'0'};$env:GRAVE_RECORDS_DB=Join-Path $launchRoot ('output/'+$launchLabel+'-'+$Audience+'-records.sqlite')
 $launchNode=(Get-Command node).Source
 $launchBackend=Start-Process -FilePath $launchNode -ArgumentList @(('"'+$launchManifest.backend.path+'"')) -WorkingDirectory $launchRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput ('output/'+$launchLabel+'-'+$Audience+'-server.log') -RedirectStandardError ('output/'+$launchLabel+'-'+$Audience+'-server-errors.log')
 $launchRelative=[IO.Path]::GetRelativePath($launchRoot,$launchManifest.root)
 $launchClient=Start-Process -FilePath $launchNode -ArgumentList @('node_modules/vite/bin/vite.js','preview','--outDir',$launchRelative,'--host','127.0.0.1','--port',[string]$launchClientPort,'--strictPort') -WorkingDirectory $launchRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput ('output/'+$launchLabel+'-'+$Audience+'-client.log') -RedirectStandardError ('output/'+$launchLabel+'-'+$Audience+'-client-errors.log')
} finally {foreach($launchName in $launchSaved.Keys){[Environment]::SetEnvironmentVariable($launchName,$launchSaved[$launchName],'Process')}}
$launchReport=[ordered]@{createdAt=[DateTime]::UtcNow.ToString('o');sourceCommit=$launchManifest.sourceCommit;audience=$Audience;launcherPid=$PID;backend=[ordered]@{pid=$launchBackend.Id;port=$launchServerPort;startedAt=$launchBackend.StartTime.ToUniversalTime().ToString('o')};client=[ordered]@{pid=$launchClient.Id;port=$launchClientPort;root=$launchManifest.root;startedAt=$launchClient.StartTime.ToUniversalTime().ToString('o')}}
[IO.File]::WriteAllText((Join-Path $launchRoot ($Scope+'/processes-'+$Audience+'.json')),($launchReport|ConvertTo-Json -Depth 5)+"`n",[Text.UTF8Encoding]::new($false))
Write-Output ($launchReport|ConvertTo-Json -Compress -Depth 5)
Wait-Process -Id $launchBackend.Id,$launchClient.Id
