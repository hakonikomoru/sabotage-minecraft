# Start Bridge (8787) and BDS (19132) in separate PowerShell windows.
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$bdsRoot = Join-Path $repoRoot "bds"
$bdsExe = Join-Path $bdsRoot "bedrock_server.exe"

if (-not (Test-Path $bdsExe)) {
  Write-Error "BDS not found: $bdsExe"
  exit 1
}

Write-Host "Starting Bridge in a new window (port 8787)..."
Start-Process powershell `
  -WorkingDirectory $repoRoot `
  -ArgumentList "-NoExit", "-Command", "npm run bridge:dev"

Start-Sleep -Seconds 1

Write-Host "Starting BDS in a new window (port 19132)..."
Start-Process powershell `
  -WorkingDirectory $bdsRoot `
  -ArgumentList "-NoExit", "-Command", ".\bedrock_server.exe"

Write-Host ""
Write-Host "Done. Connect in Minecraft: 127.0.0.1:19132"
Write-Host "Stop each server with Ctrl+C in its window."
