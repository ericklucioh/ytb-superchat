param(
  [int]$Port = 8000
)

$url = "http://localhost:$Port/src/index.html"
Start-Process $url
