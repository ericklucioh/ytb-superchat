param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$server = Get-Command py -ErrorAction SilentlyContinue
if ($server) {
  & py -3 -m http.server $Port
  exit $LASTEXITCODE
}

$server = Get-Command python -ErrorAction SilentlyContinue
if ($server) {
  & python -m http.server $Port
  exit $LASTEXITCODE
}

throw "Python was not found. Install Python or use Live Server in VS Code."
