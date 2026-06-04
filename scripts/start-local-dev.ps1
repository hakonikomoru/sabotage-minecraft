# Start Bridge (8787) and BDS (19132) in separate PowerShell windows.
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$bdsRoot = Join-Path $repoRoot "bds"
$bdsExe = Join-Path $bdsRoot "bedrock_server.exe"
$statePath = Join-Path $repoRoot ".dev-local.json"

if (-not (Test-Path $bdsExe)) {
  Write-Error "BDS not found: $bdsExe"
  exit 1
}

Write-Host "Starting Bridge in a new window (port 8787)..."
$bridgeShell = Start-Process powershell `
  -WorkingDirectory $repoRoot `
  -PassThru `
  -ArgumentList "-NoLogo", "-Command", "`$Host.UI.RawUI.WindowTitle='SAB-Bridge'; npm run bridge:dev"

Start-Sleep -Seconds 1

Write-Host "Starting BDS in a new window (port 19132)..."
$bdsShell = Start-Process powershell `
  -WorkingDirectory $bdsRoot `
  -PassThru `
  -ArgumentList "-NoLogo", "-Command", "`$Host.UI.RawUI.WindowTitle='SAB-BDS'; .\bedrock_server.exe"

@{
  bridgeShellPid = $bridgeShell.Id
  bdsShellPid = $bdsShell.Id
  startedAt = (Get-Date).ToString("o")
} | ConvertTo-Json | Set-Content -Path $statePath -Encoding utf8

Write-Host "Done. Connect in Minecraft: 127.0.0.1:19132"
Write-Host "Stop servers and close windows: npm run dev:local:stop"
