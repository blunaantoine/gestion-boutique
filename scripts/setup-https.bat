@echo off
chcp 65001 >nul
echo.
echo 🔐 Configuration HTTPS pour le développement local
echo ==================================================
echo.

set CERTS_DIR=.\certs
set KEY_FILE=%CERTS_DIR%\localhost-key.pem
set CERT_FILE=%CERTS_DIR%\localhost.pem

REM Créer le dossier certs s'il n'existe pas
if not exist %CERTS_DIR% mkdir %CERTS_DIR%

REM Vérifier si openssl est disponible
where openssl >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ OpenSSL n'est pas installé ou n'est pas dans le PATH.
    echo.
    echo 📌 SOLUTIONS:
    echo.
    echo Option 1: Installer Git pour Windows (inclut OpenSSL)
    echo    Télécharger: https://git-scm.com/download/win
    echo    Après installation, OpenSSL sera disponible
    echo.
    echo Option 2: Utiliser mkcert (recommandé)
    echo    1. Télécharger: https://github.com/FiloSottile/mkcert/releases
    echo    2. Extraire mkcert.exe dans ce dossier
    echo    3. Exécuter: mkcert.exe -install
    echo    4. Exécuter: mkcert.exe -key-file %KEY_FILE% -cert-file %CERT_FILE% localhost 192.168.1.69
    echo.
    echo Option 3: Utiliser ngrok (tunneling HTTPS)
    echo    1. Télécharger: https://ngrok.com
    echo    2. Exécuter: ngrok http 3000
    echo    3. Utiliser l'URL HTTPS fournie
    echo.
    pause
    exit /b 1
)

echo 📦 Génération des certificats SSL...
echo.

REM Générer les certificats
openssl req -x509 -newkey rsa:4096 -keyout %KEY_FILE% -out %CERT_FILE% -days 365 -nodes -subj "/C=SN/ST=Dakar/L=Dakar/O=GestionBoutique/OU=Dev/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:192.168.1.69"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ Certificats générés avec succès!
    echo.
    echo 📁 Fichiers créés:
    echo    - %KEY_FILE%
    echo    - %CERT_FILE%
    echo.
    echo ⚠️  IMPORTANT - Installation du certificat sur Windows:
    echo    1. Double-cliquez sur %CERT_FILE%
    echo    2. Cliquez 'Installer le certificat'
    echo    3. Sélectionnez 'Ordinateur local'
    echo    4. Choisissez 'Placer tous les certificats dans le magasin suivant'
    echo    5. Sélectionnez 'Autorités de certification racines de confiance'
    echo    6. Cliquez 'OK'
    echo.
    echo 🚀 Redémarrez le serveur avec: bun run dev-https
    echo.
) else (
    echo.
    echo ❌ Erreur lors de la génération des certificats
    pause
    exit /b 1
)

pause
