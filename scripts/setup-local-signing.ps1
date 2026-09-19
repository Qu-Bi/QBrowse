# PowerShell script to create and install a local trusted code-signing certificate for QBrowse
# This eliminates "Unknown Publisher" / SmartScreen warnings on your local development and test machines.

$certName = "QuBI Software"
$pfxPath = "$PSScriptRoot\..\certs\qbrowse-local.pfx"
$pfxPassword = "qbrowse-local-secret"

# Ensure certs directory exists
$certsDir = Split-Path $pfxPath
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir -Force | Out-Null
}

Write-Host "Checking for existing certificate..." -ForegroundColor Cyan
$existingCert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.Subject -like "*$certName*" -and $_.EnhancedKeyUsageList.ObjectId -contains "1.3.6.1.5.5.7.3.3" } | Select-Object -First 1

if (-not $existingCert) {
    Write-Host "Creating new self-signed Code Signing certificate for '$certName'..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject "CN=$certName, O=QuBI, C=US" `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -NotAfter (Get-Date).AddYears(5) `
        -CertStoreLocation "Cert:\CurrentUser\My"
} else {
    Write-Host "Found existing certificate in Personal store." -ForegroundColor Green
    $cert = $existingCert
}

# Trust the certificate in Trusted Root Certification Authorities
Write-Host "Installing certificate to Trusted Root Certification Authorities..." -ForegroundColor Cyan
$rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
$rootStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$rootStore.Add($cert)
$rootStore.Close()

# Export to PFX
Write-Host "Exporting certificate to $pfxPath..." -ForegroundColor Cyan
$securePassword = ConvertTo-SecureString -String $pfxPassword -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword -Force | Out-Null

Write-Host "`nCertificate setup complete!" -ForegroundColor Green
Write-Host "You can now sign Windows builds locally by running:" -ForegroundColor White
Write-Host '  $env:CSC_LINK = "certs/qbrowse-local.pfx"' -ForegroundColor Yellow
Write-Host '  $env:CSC_KEY_PASSWORD = "qbrowse-local-secret"' -ForegroundColor Yellow
Write-Host '  npm run build:win' -ForegroundColor Yellow
