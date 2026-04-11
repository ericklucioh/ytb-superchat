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

$siteUrl = "http://localhost:$Port/src/index.html"
Start-Process $siteUrl

if ($Session) {
  $overlayUrl = "http://localhost:$Port/extension/index.html?session=$Session"
  Write-Host "Overlay: $overlayUrl"
}
