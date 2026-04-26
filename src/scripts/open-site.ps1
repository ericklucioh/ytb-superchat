param(
  [int]$Port = 8000
)

node (Join-Path $PSScriptRoot "open.mjs") site --port $Port
