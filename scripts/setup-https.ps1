# Script PowerShell pour générer des certificats SSL auto-signés pour le développement local

Write-Host "🔐 Configuration HTTPS pour le développement local" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$CERTS_DIR = ".\certs"
$KEY_FILE = "$CERTS_DIR\localhost-key.pem"
$CERT_FILE = "$CERTS_DIR\localhost.pem"

# Créer le dossier certs s'il n'existe pas
if (-not (Test-Path $CERTS_DIR)) {
    New-Item -ItemType Directory -Path $CERTS_DIR | Out-Null
}

# Vérifier si openssl est disponible
$openssl = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $openssl) {
    Write-Host "❌ OpenSSL n'est pas installé ou n'est pas dans le PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "📌 SOLUTIONS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Installer Git pour Windows (inclut OpenSSL)" -ForegroundColor White
    Write-Host "   Télécharger: https://git-scm.com/download/win" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Utiliser mkcert (recommandé)" -ForegroundColor White
    Write-Host "   1. Télécharger: https://github.com/FiloSottile/mkcert/releases" -ForegroundColor Gray
    Write-Host "   2. Extraire et copier mkcert.exe dans ce dossier" -ForegroundColor Gray
    Write-Host "   3. Exécuter: .\mkcert.exe -install" -ForegroundColor Gray
    Write-Host "   4. Exécuter: .\mkcert.exe -key-file $KEY_FILE -cert-file $CERT_FILE localhost 192.168.1.69" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 3: Utiliser ngrok (tunneling HTTPS)" -ForegroundColor White
    Write-Host "   1. Télécharger: https://ngrok.com" -ForegroundColor Gray
    Write-Host "   2. Exécuter: ngrok http 3000" -ForegroundColor Gray
    Write-Host "   3. Utiliser l'URL HTTPS fournie (ex: https://abc123.ngrok.io)" -ForegroundColor Gray
    exit 1
}

Write-Host "📦 Génération des certificats SSL..." -ForegroundColor Green
Write-Host ""

# Générer la clé privée et le certificat
$opensslArgs = @(
    "req", "-x509", "-newkey", "rsa:4096",
    "-keyout", $KEY_FILE,
    "-out", $CERT_FILE,
    "-days", "365",
    "-nodes",
    "-subj", "/C=SN/ST=Dakar/L=Dakar/O=GestionBoutique/OU=Dev/CN=localhost",
    "-addext", "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:192.168.1.69"
)

& openssl $opensslArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Certificats générés avec succès!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Fichiers créés:" -ForegroundColor White
    Write-Host "   - $KEY_FILE" -ForegroundColor Gray
    Write-Host "   - $CERT_FILE" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  IMPORTANT - Installation du certificat sur Windows:" -ForegroundColor Yellow
    Write-Host "   1. Double-cliquez sur $CERT_FILE" -ForegroundColor White
    Write-Host "   2. Cliquez 'Installer le certificat'" -ForegroundColor White
    Write-Host "   3. Sélectionnez 'Ordinateur local'" -ForegroundColor White
    Write-Host "   4. Choisissez 'Placer tous les certificats dans le magasin suivant'" -ForegroundColor White
    Write-Host "   5. Sélectionnez 'Autorités de certification racines de confiance'" -ForegroundColor White
    Write-Host "   6. Cliquez 'OK'" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  IMPORTANT - Installation sur Android:" -ForegroundColor Yellow
    Write-Host "   1. Transférez $CERT_FILE sur votre téléphone" -ForegroundColor White
    Write-Host "   2. Allez dans Paramètres > Sécurité > Certificats" -ForegroundColor White
    Write-Host "   3. Installez le certificat" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Redémarrez le serveur avec: bun run dev-https" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erreur lors de la génération des certificats" -ForegroundColor Red
    exit 1
}
