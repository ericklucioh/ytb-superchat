param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

node (Join-Path $PSScriptRoot "serve.mjs") --port $Port
