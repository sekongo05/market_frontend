# Market Frontend - Quick Start Guide

## 🚀 Prérequis

- **Node.js**: v20 ou v22 (installé actuellement: v18)
- **npm**: dernière version

## 📦 Installation

### 1. Mettre à jour Node.js

Si vous avez NVM (Node Version Manager):
```bash
nvm install 20
nvm use 20
```

Sinon, téléchargez depuis: https://nodejs.org/

### 2. Installer les dépendances

```bash
cd /home/mosek/Bureau/market-frontend
npm install
```

## 🏃 Démarrage

### Serveur de développement
```bash
npm start
```

Accédez à: **http://localhost:4200**

### Build production
```bash
npm run build
```

## ✨ Fonctionnalités implémentées

### 🔐 Authentification
- ✅ Inscription `/auth/register`
- ✅ Connexion `/auth/login`
- ✅ Tokens JWT stockés localement
- ✅ Refresh token automatique
- ✅ Logout et session management

### 🛍️ Catalogue
- ✅ Liste des produits `/products`
- ✅ Recherche et filtrage
- ✅ Pagination
- ✅ Images produits

### 👤 Utilisateur
- ✅ Navbar avec profil
- ✅ Menu utilisateur
- ✅ Mes commandes `/orders`

### 📡 Intégration API
- ✅ 11+ services pour l'API complète
- ✅ Gestion automatique des tokens
- ✅ Intercepteurs pour erreurs 401/403
- ✅ Support pagination

### 🎨 Design
- ✅ TailwindCSS v4
- ✅ Responsive mobile/desktop
- ✅ Mode clair/sombre ready

## 📋 À faire

### Haute priorité
- [ ] Panier shopping (Cart)
- [ ] Page détail produit
- [ ] Checkout et paiement Wave CI
- [ ] Suivi livraison en temps réel

### Moyenne priorité
- [ ] Admin dashboard
- [ ] Gestion produits (Admin)
- [ ] Notifications temps réel
- [ ] Profil utilisateur complet

### Basse priorité
- [ ] Tests unitaires
- [ ] Intégration E2E
- [ ] Progressive Web App
- [ ] Thème dark mode

## 🔗 URLs importantes

- Frontend: http://localhost:4200
- Backend API: http://localhost:8080/api
- Documentation API: Voir FRONTEND_SETUP.md

## 🛠️ Commandes utiles

```bash
# Serveur dev (hot reload)
npm start

# Build production
npm run build

# Tests unitaires
npm test

# Linting (si configuré)
npm run lint

# Nettoyer et réinstaller
rm -rf node_modules && npm install
```

## 🐛 Dépannage

### Port 4200 déjà en utilisation
```bash
ng serve --port 4201
```

### Erreurs de compilation
```bash
# Forcer la réinstallation
rm -rf node_modules package-lock.json
npm install
npm start
```

### Token expiré
L'application se déconnecte automatiquement et redirige vers login.

## 📚 Structure

```
src/app/
├── core/              # Services, models, interceptors
├── shared/            # Composants réutilisables
├── features/          # Pages des features
│   ├── auth/
│   ├── products/
│   └── orders/
├── app.routes.ts      # Routes principales
└── app.config.ts      # Configuration
```

## 🎯 Prochains pas

1. ✅ Mettre à jour Node.js à v20+
2. ✅ Lancer `npm install`
3. ✅ Démarrer avec `npm start`
4. ✅ Tester les pages (login, produits, commandes)
5. ✅ Implémenter le panier et checkout

## 📞 Support

En cas de problème:
1. Vérifier Node.js: `node --version` (doit être ≥20)
2. Vérifier npm: `npm --version`
3. Vérifier API backend: http://localhost:8080/api
4. Vérifier la console du navigateur pour les erreurs

---

**Bon développement! 🚀**
