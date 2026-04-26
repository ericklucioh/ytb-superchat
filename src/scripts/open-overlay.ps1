param(
  [int]$Port = 8000,
  [string]$Session = ""
)

node (Join-Path $PSScriptRoot "open.mjs") overlay --port $Port --session $Session
