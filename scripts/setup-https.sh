#!/bin/bash

# Script pour générer des certificats SSL auto-signés pour le développement local

CERTS_DIR="./certs"
KEY_FILE="$CERTS_DIR/localhost-key.pem"
CERT_FILE="$CERTS_DIR/localhost.pem"

echo "🔐 Configuration HTTPS pour le développement local"
echo "=================================================="
echo ""

# Créer le dossier certs s'il n'existe pas
mkdir -p $CERTS_DIR

# Vérifier si openssl est disponible
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL n'est pas installé."
    echo ""
    echo "Sur Windows, vous pouvez:"
    echo "1. Installer Git pour Windows (inclut OpenSSL)"
    echo "2. Ou utiliser mkcert (recommandé):"
    echo "   - Télécharger: https://github.com/FiloSottile/mkcert/releases"
    echo "   - Exécuter: mkcert -install"
    echo "   - Puis: mkcert -key-file $KEY_FILE -cert-file $CERT_FILE localhost 192.168.1.69"
    exit 1
fi

echo "📦 Génération des certificats SSL..."
echo ""

# Générer la clé privée et le certificat
openssl req -x509 -newkey rsa:4096 -keyout "$KEY_FILE" -out "$CERT_FILE" -days 365 -nodes \
    -subj "/C=SN/ST=Dakar/L=Dakar/O=GestionBoutique/OU=Dev/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:192.168.1.69"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Certificats générés avec succès!"
    echo ""
    echo "📁 Fichiers créés:"
    echo "   - $KEY_FILE"
    echo "   - $CERT_FILE"
    echo ""
    echo "⚠️  IMPORTANT - Sur Windows:"
    echo "   1. Double-cliquez sur $CERT_FILE"
    echo "   2. Cliquez 'Installer le certificat'"
    echo "   3. Sélectionnez 'Ordinateur local'"
    echo "   4. Choisissez 'Placer tous les certificats dans le magasin suivant'"
    echo "   5. Sélectionnez 'Autorités de certification racines de confiance'"
    echo "   6. Cliquez 'OK'"
    echo ""
    echo "⚠️  IMPORTANT - Sur Android:"
    echo "   1. Transférez $CERT_FILE sur votre téléphone"
    echo "   2. Allez dans Paramètres > Sécurité > Certificats"
    echo "   3. Installez le certificat"
    echo ""
    echo "🚀 Redémarrez le serveur avec: bun run dev-https"
else
    echo ""
    echo "❌ Erreur lors de la génération des certificats"
    exit 1
fi
