# Script PowerShell pour generer des certificats SSL auto-signes

Write-Host "Configuration HTTPS pour le developpement local" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$CERTS_DIR = ".\certs"
$KEY_FILE = "$CERTS_DIR\localhost-key.pem"
$CERT_FILE = "$CERTS_DIR\localhost.pem"

# Creer le dossier certs s'il n'existe pas
if (-not (Test-Path $CERTS_DIR)) {
    New-Item -ItemType Directory -Path $CERTS_DIR | Out-Null
}

# Verifier si openssl est disponible
$openssl = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $openssl) {
    Write-Host "OpenSSL n'est pas installe ou n'est pas dans le PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUTIONS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Installer Git pour Windows (inclut OpenSSL)" -ForegroundColor White
    Write-Host "   Telecharger: https://git-scm.com/download/win" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Utiliser mkcert (recommande)" -ForegroundColor White
    Write-Host "   1. Telecharger: https://github.com/FiloSottile/mkcert/releases" -ForegroundColor Gray
    Write-Host "   2. Extraire mkcert.exe dans ce dossier" -ForegroundColor Gray
    Write-Host "   3. Executer: .\mkcert.exe -install" -ForegroundColor Gray
    Write-Host "   4. Executer: .\mkcert.exe -key-file $KEY_FILE -cert-file $CERT_FILE localhost" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 3: Utiliser ngrok (tunneling HTTPS)" -ForegroundColor White
    Write-Host "   1. Telecharger: https://ngrok.com" -ForegroundColor Gray
    Write-Host "   2. Executer: ngrok http 3000" -ForegroundColor Gray
    Write-Host "   3. Utiliser l'URL HTTPS fournie" -ForegroundColor Gray
    exit 1
}

Write-Host "Generation des certificats SSL..." -ForegroundColor Green
Write-Host ""

# Generer la cle privee et le certificat
$openSSLArgs = "req -x509 -newkey rsa:4096 -keyout $KEY_FILE -out $CERT_FILE -days 365 -nodes -subj /C=SN/ST=Dakar/L=Dakar/O=GestionBoutique/OU=Dev/CN=localhost"

Invoke-Expression "openssl $openSSLArgs"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Certificats generes avec succes!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Fichiers crees:" -ForegroundColor White
    Write-Host "   - $KEY_FILE" -ForegroundColor Gray
    Write-Host "   - $CERT_FILE" -ForegroundColor Gray
    Write-Host ""
    Write-Host "IMPORTANT - Installation du certificat sur Windows:" -ForegroundColor Yellow
    Write-Host "   1. Double-cliquez sur $CERT_FILE" -ForegroundColor White
    Write-Host "   2. Cliquez 'Installer le certificat'" -ForegroundColor White
    Write-Host "   3. Selectionnez 'Ordinateur local'" -ForegroundColor White
    Write-Host "   4. Choisissez 'Placer tous les certificats dans le magasin suivant'" -ForegroundColor White
    Write-Host "   5. Selectionnez 'Autorites de certification racines de confiance'" -ForegroundColor White
    Write-Host "   6. Cliquez 'OK'" -ForegroundColor White
    Write-Host ""
    Write-Host "Redemarrez le serveur avec: bun run dev-https" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Erreur lors de la generation des certificats" -ForegroundColor Red
    exit 1
}
