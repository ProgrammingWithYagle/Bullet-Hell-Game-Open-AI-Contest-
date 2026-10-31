$ErrorActionPreference='Stop'
$original='C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)\release\Grave-Accord-2026.10.30-shared-network-public-win32-x64'
$extracted='C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)\output\windows-shared-network-2026-10-30\fresh-deep-extraction\Grave-Accord-2026.10.30-shared-network-public-win32-x64'
$copied='C:\Users\yigal\OneDrive\Documents\ChatGPT\OpenAI Multiplayer Game Contest (Bullet Hell)\output\windows-shared-network-2026-10-30\ordinary-deep-copy-日本語\Grave-Accord-2026.10.30-shared-network-public-win32-x64'
$cases=@(@{Path=$original;Kind='lan';Label='original-01'},@{Path=$extracted;Kind='smoke';Label='deep-extracted-01'},@{Path=$extracted;Kind='lan';Label='deep-extracted-01'},@{Path=$copied;Kind='smoke';Label='deep-copied-01'},@{Path=$copied;Kind='lan';Label='deep-copied-01'})
foreach($case in $cases){& ./reviews/windows-shared-network-2026-10-30/native-fixture.ps1 -PackagePath $case.Path -Kind $case.Kind -Label $case.Label}
$i=0
foreach($folder in @($original,$extracted,$copied)){& python tools/verify-desktop-package.py $folder --verification reviews/shared-network-2026-10-30/gate-03/runtime-verification.json --report ('reviews/windows-shared-network-2026-10-30/package-post-native-'+$i+'.json');if($LASTEXITCODE -ne 0){throw 'Post-native bytes differ'};$i++}
