param(
  [int]$Port = 8000
)

$url = "http://localhost:$Port/portal"
Start-Process $url
