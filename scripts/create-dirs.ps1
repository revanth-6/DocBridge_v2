$base = "c:\Users\DELL\Downloads\Azure_Project\docbridge\services"
$services = @(
  "consultation-service",
  "prescription-service",
  "reminder-service",
  "labreport-service",
  "symptom-service",
  "ai-companion-service",
  "health-summary-service",
  "family-service"
)
$subdirs = @("src\config","src\models","src\controllers","src\services","src\routes","src\middleware","src\validators")

foreach ($svc in $services) {
  foreach ($sub in $subdirs) {
    $fullPath = Join-Path $base (Join-Path $svc $sub)
    if (!(Test-Path $fullPath)) {
      New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
    }
  }
}
Write-Host "All service directories created successfully"
