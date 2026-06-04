# Stop Bridge (8787), BDS (19132), and dev:local PowerShell windows.



$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

$bdsRoot = Join-Path $repoRoot "bds"

$bdsExeName = "bedrock_server.exe"

$statePath = Join-Path $repoRoot ".dev-local.json"



function Stop-ProcessTree {

  param(

    [int]$ProcessId,

    [string]$Label

  )



  if (-not $ProcessId) {

    return $false

  }



  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue

  if (-not $process) {

    Write-Host "[$Label] PID $ProcessId - already closed"

    return $false

  }



  Write-Host "[$Label] closing process tree ($($process.ProcessName) PID $ProcessId)..."

  & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null

  Start-Sleep -Milliseconds 200



  if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {

    Write-Host "[$Label] retrying with Stop-Process -Force..."

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue

  }



  return $true

}



function Stop-ListenerOnPort {

  param(

    [int]$Port,

    [string]$Label,

    [ValidateSet("TCP", "UDP", "Both")]

    [string]$Protocol = "TCP"

  )



  $processIds = @()



  if ($Protocol -in @("TCP", "Both")) {

    $tcpConnections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

    if ($tcpConnections) {

      $processIds += $tcpConnections | Select-Object -ExpandProperty OwningProcess -Unique

    }

  }



  if ($Protocol -in @("UDP", "Both")) {

    $udpEndpoints = Get-NetUDPEndpoint -LocalPort $Port -ErrorAction SilentlyContinue

    if ($udpEndpoints) {

      $processIds += $udpEndpoints | Select-Object -ExpandProperty OwningProcess -Unique

    }

  }



  $processIds = $processIds | Sort-Object -Unique



  if (-not $processIds) {

    Write-Host "[$Label] port $Port - not running"

    return

  }



  foreach ($processId in $processIds) {

    Stop-ProcessTree -ProcessId $processId -Label "$Label (port $Port)"

  }

}



function Stop-ProjectServerProcesses {

  $bdsProcesses = Get-Process -Name $bdsExeName -ErrorAction SilentlyContinue | Where-Object {

    $_.Path -and ($_.Path -like "$bdsRoot*")

  }



  foreach ($process in $bdsProcesses) {

    Stop-ProcessTree -ProcessId $process.Id -Label "BDS ($bdsExeName)"

  }



  $shellProcesses = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |

    Where-Object { $_.Name -in @("powershell.exe", "pwsh.exe", "node.exe", "cmd.exe") }



  foreach ($shell in $shellProcesses) {

    $commandLine = $shell.CommandLine

    if (-not $commandLine) {

      continue

    }



    $isBridgeProcess =

      $commandLine -match [regex]::Escape($repoRoot.Path) -and

      ($commandLine -match "bridge:dev" -or $commandLine -match "sabotage-minecraft-bridge")



    if ($isBridgeProcess) {

      Stop-ProcessTree -ProcessId $shell.ProcessId -Label "Bridge process"

    }

  }

}



function Stop-DevLocalShellWindows {

  $shellProcesses = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |

    Where-Object { $_.Name -in @("powershell.exe", "pwsh.exe") }



  foreach ($shell in $shellProcesses) {

    $commandLine = $shell.CommandLine

    if (-not $commandLine) {

      continue

    }



    $isBridgeWindow =

      $commandLine -match "npm run bridge:dev" -or

      $commandLine -match "SAB-Bridge"



    $isBdsWindow =

      $commandLine -match [regex]::Escape($bdsExeName) -or

      $commandLine -match "SAB-BDS"



    if ($isBridgeWindow) {

      Stop-ProcessTree -ProcessId $shell.ProcessId -Label "Bridge window"

    } elseif ($isBdsWindow) {

      Stop-ProcessTree -ProcessId $shell.ProcessId -Label "BDS window"

    }

  }

}



if (Test-Path $statePath) {

  $state = Get-Content $statePath -Raw | ConvertFrom-Json

  Stop-ProcessTree -ProcessId ([int]$state.bridgeShellPid) -Label "Bridge window (saved)"

  Stop-ProcessTree -ProcessId ([int]$state.bdsShellPid) -Label "BDS window (saved)"

  Remove-Item $statePath -Force -ErrorAction SilentlyContinue

}



Stop-ProjectServerProcesses

Stop-ListenerOnPort -Port 8787 -Label "Bridge" -Protocol "TCP"

Stop-ListenerOnPort -Port 19132 -Label "BDS" -Protocol "UDP"

Stop-DevLocalShellWindows



Write-Host ""

Write-Host "Done. Ports 8787 and 19132 should be free."


