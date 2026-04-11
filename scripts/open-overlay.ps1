param(
  [int]$Port = 8000,
  [string]$Session = ""
)

$suffix = ""
if ($Session) {
  $suffix = "?session=$Session"
}

$url = "http://localhost:$Port/index.html$suffix"
Start-Process $url
