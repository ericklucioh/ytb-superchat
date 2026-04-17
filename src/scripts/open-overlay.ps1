param(
  [int]$Port = 8000,
  [string]$Session = ""
)

$suffix = ""
if ($Session) {
  $suffix = "?session=$Session"
}

$url = "http://localhost:$Port/overlay$suffix"
Start-Process $url
