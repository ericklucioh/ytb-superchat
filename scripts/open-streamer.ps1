param(
  [int]$Port = 8000
)

$url = "http://localhost:$Port/"
Start-Process $url
