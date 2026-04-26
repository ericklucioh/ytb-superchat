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

node (Join-Path $PSScriptRoot "open.mjs") site --port $Port

if ($Session) {
  $encodedSession = [uri]::EscapeDataString($Session)
  $overlayUrl = "http://localhost:$Port/overlay?session=$encodedSession"
  Write-Host "Overlay: $overlayUrl"
}
