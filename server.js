const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Check if certificates exist
const keyPath = path.join(__dirname, 'certs', 'localhost-key.pem');
const certPath = path.join(__dirname, 'certs', 'localhost.pem');

let httpsOptions = null;

try {
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  console.log('✅ Certificats SSL trouvés - HTTPS activé');
} catch (e) {
  console.log('⚠️  Certificats SSL non trouvés - Mode HTTP');
  console.log('   Pour activer HTTPS, exécutez: bun run setup-https');
}

app.prepare().then(() => {
  if (httpsOptions) {
    // HTTPS Server
    createServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, hostname, () => {
      console.log(`
🚀 Serveur HTTPS démarré!

📱 Sur votre téléphone (même réseau WiFi):
   https://192.168.1.69:3000

💻 Sur votre ordinateur:
   https://localhost:3000

⚠️  Note: Acceptez l'avertissement de sécurité du navigateur
      (certificat auto-signé)
`);
    });
  } else {
    // Fallback to HTTP
    const { createServer: createHttpServer } = require('http');
    createHttpServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, hostname, () => {
      console.log(`
🚀 Serveur HTTP démarré!

📱 Sur votre téléphone (même réseau WiFi):
   http://192.168.1.69:3000

💻 Sur votre ordinateur:
   http://localhost:3000

💡 Pour HTTPS (caméra sur téléphone), exécutez: bun run setup-https
`);
    });
  }
});
