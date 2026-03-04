# Guide d'installation - Gestion de Boutique

## 🚀 Installation rapide

### 1. Cloner le repository
```bash
git clone https://github.com/blunaantoine/gestion-boutique.git
cd gestion-boutique
```

### 2. Installer les dépendances
```bash
bun install
```

### 3. Configurer la base de données
```bash
bun run db:push
```

### 4. Lancer l'application
```bash
bun run dev
```

### 5. Ouvrir dans le navigateur
```
http://localhost:3000
```

---

## 📱 Configuration pour le téléphone

### Étape 1 : Trouver l'IP de l'ordinateur

**Windows :**
```bash
ipconfig
```
Cherchez "Adresse IPv4" (ex: 192.168.1.100)

**Mac/Linux :**
```bash
ip a
```
ou
```bash
ifconfig
```

### Étape 2 : Sur le téléphone

1. Connectez le téléphone au même WiFi que l'ordinateur
2. Ouvrez le navigateur
3. Entrez l'adresse : `http://VOTRE-IP:3000`
   - Exemple : `http://192.168.1.100:3000`

### Étape 3 : Configurer la connexion

Dans l'application sur le téléphone :
1. Cliquez sur ⚙️ (en haut à droite)
2. Entrez l'adresse : `http://VOTRE-IP:3000`
3. Cliquez sur "Tester"
4. Cliquez sur "Enregistrer"

---

## 🔧 Installation de Bun (si nécessaire)

**Windows (PowerShell) :**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Mac/Linux :**
```bash
curl -fsSL https://bun.sh/install | bash
```

---

## 📋 Fonctionnalités

- ✅ **Caisse** - Effectuer des ventes rapidement
- ✅ **Produits** - Gérer l'inventaire
- ✅ **Employés** - Gérer les comptes employés
- ✅ **Rapports** - Statistiques de ventes
- ✅ **Synchronisation WiFi** - Ordinateur ↔ Téléphone

---

## 🔑 Première utilisation

1. Créez un compte **Gérant** (propriétaire)
2. Ajoutez vos produits
3. Créez des comptes employés si nécessaire
4. Les employés peuvent se connecter via "Espace Employé"

---

## ⚠️ Dépannage

### Le téléphone ne peut pas se connecter
- Vérifiez que l'ordinateur et le téléphone sont sur le même WiFi
- Vérifiez que le pare-feu Windows autorise le port 3000
- Essayez de désactiver temporairement le pare-feu

### L'application ne démarre pas
```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules
bun install
bun run db:push
bun run dev
```

### Erreur de base de données
```bash
# Réinitialiser la base de données
rm -rf db/
bun run db:push
```
