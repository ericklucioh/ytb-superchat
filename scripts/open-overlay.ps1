param(
  [int]$Port = 8000,
  [string]$Session = ""
)

$suffix = ""
if ($Session) {
  $suffix = "?session=$Session"
}

$url = "http://localhost:$Port/extension/index.html$suffix"
Start-Process $url
