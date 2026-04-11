param(
  [int]$Port = 8000
)

$url = "http://localhost:$Port/streamer.html"
Start-Process $url
