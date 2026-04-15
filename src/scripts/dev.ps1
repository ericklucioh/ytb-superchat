param(
  [int]$Port = 8000,
  [string]$Session = ""
)

$ErrorActionPreference = "Stop"

$serverArgs = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", (Join-Path $PSScriptRoot "serve.ps1"),
  "-Port", $Port
)

Start-Process -FilePath "powershell" -ArgumentList $serverArgs | Out-Null
Start-Sleep -Seconds 2

Write-Host "Home: http://localhost:$Port/"
Write-Host "Portal: http://localhost:$Port/portal"

Start-Process "http://localhost:$Port/portal"

if ($Session) {
  $overlayUrl = "http://localhost:$Port/extension/index.html?session=$Session"
  Write-Host "Overlay: $overlayUrl"
}
