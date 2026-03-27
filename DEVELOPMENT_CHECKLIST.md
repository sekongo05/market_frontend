# ✅ Market Frontend - Checklist de développement

## 🚀 Phase 0: Démarrage (VOUS ÊTES ICI)

### Préparation
- [ ] Mettre à jour Node.js à v20+ (`nvm install 20`)
- [ ] Vérifier: `node --version`
- [ ] Vérifier: `npm --version`

### Installation
- [ ] Naviguer: `cd /home/mosek/Bureau/market-frontend`
- [ ] Installer: `npm install`
- [ ] Tester: `npm start`
- [ ] Accéder: http://localhost:4200

### Vérifications
- [ ] Page d'accueil s'affiche
- [ ] Navbar visible en haut
- [ ] Lien "Connexion" fonctionne
- [ ] Pas d'erreurs dans la console

---

## 🔐 Phase 1: Authentification (1-2 jours)

### Pages existantes
- [x] LoginComponent (/auth/login)
- [x] RegisterComponent (/auth/register)
- [x] AuthService complet
- [x] Tokens JWT gérés

### À tester
- [ ] S'inscrire avec email valide
- [ ] Token stocké dans localStorage
- [ ] Connexion avec identifiants
- [ ] Navbar affiche "Mon Profil"
- [ ] Bouton déconnexion fonctionne
- [ ] Redirection auto vers login si 401

### À implémenter (optionnel)
- [ ] Page "Mot de passe oublié" (/auth/forgot-password)
- [ ] Réinitialisation mot de passe
- [ ] 2FA / Authentification double (future)

---

## 🛍️ Phase 2: Catalogue produits (1-2 jours)

### Pages existantes
- [x] ProductsComponent (/products)
- [x] ProductService avec pagination
- [x] Recherche et filtrage

### À implémenter
- [ ] Page détail produit (/products/:id)
  - [ ] Afficher images produit
  - [ ] Détails complets
  - [ ] Avis/Évaluations (future)
  - [ ] Bouton "Ajouter au panier"

### À tester
- [ ] Listing affiche 12 produits
- [ ] Pagination fonctionne
- [ ] Recherche filtre les résultats
- [ ] Clic sur produit → détail
- [ ] Images s'affichent correctement
- [ ] Prix affichés en XOF

---

## 🛒 Phase 3: Panier et Checkout (2-3 jours)

### Prearrière
- [x] CartService créé avec localStorage
- [x] Méthodes: add, remove, update, clear

### À implémenter - Page Panier
- [ ] Route: /cart
- [ ] Afficher items du CartService
- [ ] Boutons +/- quantité
- [ ] Boutons supprimer
- [ ] Total hors taxes
- [ ] Bouton "Passer la commande"

### À implémenter - Page Checkout
- [ ] Route: /checkout
- [ ] Formulaire adresse livraison
- [ ] Résumé panier
- [ ] Formulaire contact (préfilled depuis profil)
- [ ] Total TTC
- [ ] Bouton "Payer avec Wave"

### À tester
- [ ] Ajouter produit au panier
- [ ] Panier persiste au rechargement
- [ ] Quantités modifiables
- [ ] Suppression fonctionne
- [ ] Totaux corrects
- [ ] Panier se vide après commande

---

## 💳 Phase 4: Paiement Wave CI (2-3 jours)

### À implémenter - Intégration Wave
- [ ] POST /api/orders → Créer commande
- [ ] POST /api/payments/wave/initiate/{orderId}
- [ ] Redirection vers Wave.com
- [ ] Gestion des callbacks

### À implémenter - Pages de paiement
- [ ] Route: /payment-success
  - [ ] Afficher message succès
  - [ ] Numéro commande
  - [ ] Lien vers suivi
- [ ] Route: /payment-error
  - [ ] Afficher message erreur
  - [ ] Retry payment button
  - [ ] Support contact

### À tester
- [ ] Créer commande depuis checkout
- [ ] Redirection vers Wave
- [ ] Simulation paiement dans Wave (test mode)
- [ ] Redirection succès/erreur
- [ ] Commande apparaît dans /orders

### Configuration
- [ ] Obtenir Wave API credentials
- [ ] Ajouter dans environment.ts
- [ ] Tester en mode bac à sable

---

## 📦 Phase 5: Commandes et suivi (1-2 jours)

### Pages existantes
- [x] OrdersComponent (/orders)
- [x] Affiche mes commandes

### À implémenter
- [ ] Détail commande (/orders/:id)
  - [ ] Items de la commande
  - [ ] Statut et timeline
  - [ ] Adresse et contact
  - [ ] Lien de suivi livraison
  - [ ] Bouton annulation (si PENDING)

- [ ] Suivi livraison (/orders/:id/track)
  - [ ] Tracking number
  - [ ] Statut livraison
  - [ ] Timeline des événements
  - [ ] Contact livreur
  - [ ] Estimation livraison

### À tester
- [ ] Voir liste commandes
- [ ] Clic → détail complet
- [ ] Statut update visible
- [ ] Suivi livraison actualisé

---

## 👤 Phase 6: Profil utilisateur (1 jour)

### Pages existantes
- [x] ProfileComponent (/profile)
- [x] Afficher infos personnelles
- [x] Changer mot de passe

### À implémenter
- [ ] Édition profil complète
  - [x] Nom, Prénom
  - [x] Téléphone
  - [ ] Avatar
  - [ ] Adresses sauvegardées

- [ ] Historique utilisateur
  - [ ] Wishlist/Favoris
  - [ ] Avis produits
  - [ ] Adresses de livraison
  - [ ] Moyens de paiement

### À tester
- [ ] Champs modifiables
- [ ] Changement mot de passe
- [ ] Validation avant save
- [ ] Messages succès/erreur

---

## 👨‍💼 Phase 7: Admin Dashboard (2-3 jours)

### Pages existantes
- [x] AdminDashboardComponent (/admin)
- [x] Stats principales

### À implémenter - Dashboard
- [ ] Widgets statistiques améliorés
- [ ] Graphiques revenus (Chart.js)
- [ ] Top produits vendus
- [ ] Commandes récentes

### À implémenter - Management
- [ ] Gestion produits (/admin/products)
  - [ ] Liste avec CRUD
  - [ ] Upload images
  - [ ] Upload en masse

- [ ] Gestion catégories (/admin/categories)
  - [ ] CRUD
  - [ ] Organisation

- [ ] Gestion commandes (/admin/orders)
  - [ ] Filtrer par statut
  - [ ] Changer statut
  - [ ] Voir détails

- [ ] Gestion utilisateurs (/admin/users)
  - [ ] Liste utilisateurs
  - [ ] Activer/Désactiver

- [ ] Gestion stock (/admin/stock)
  - [ ] Voir stock produits
  - [ ] Alertes rupture
  - [ ] Historique mouvements

### À tester
- [ ] Accès admin seulement
- [ ] CRUD pour chaque entité
- [ ] Permissions par rôle
- [ ] Actions protégées

---

## 🔔 Phase 8: Notifications (1-2 jours)

### À implémenter
- [ ] Afficher notifications en temps réel
  - [ ] Order created
  - [ ] Order confirmed
  - [ ] Order shipped
  - [ ] Order delivered
  - [ ] Payment success/failed

- [ ] NotificationCenter (/notifications)
  - [ ] Lister notifications
  - [ ] Marquer comme lu
  - [ ] Marquer tout comme lu

- [ ] Badge notifications navbar
  - [ ] Nombre non lus
  - [ ] Mise à jour auto

### À tester
- [ ] Notifications reçues
- [ ] Badge mis à jour
- [ ] Listing complet
- [ ] Actions marquer lu

---

## 🎨 Phase 9: UX/UI Polish (2-3 jours)

### Design
- [ ] Responsive mobile (tester sur mobile)
- [ ] Dark mode (optional)
- [ ] Animations transitions
- [ ] Loading states partout
- [ ] Error boundaries

### Accessibilité
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Contraste colors
- [ ] Focus visible

### Performance
- [ ] Lazy loading routes
- [ ] Image optimization
- [ ] Bundle size check
- [ ] Caching strategies

### À tester
- [ ] Sur iPhone, iPad, Android
- [ ] Tous les navigateurs
- [ ] Offline scenarios
- [ ] Connexion lente

---

## 🧪 Phase 10: Tests (3-5 jours)

### Tests unitaires
- [ ] Services 100% coverage
- [ ] Composants critiques testés
- [ ] Pipes et utils tappés

### Tests E2E
- [ ] Flow inscription complète
- [ ] Flow achat complet
- [ ] Admin operations
- [ ] Error handling

### Tests manuels
- [ ] Checklist finale (voir below)
- [ ] Regression testing
- [ ] Cross-browser testing
- [ ] Mobile testing

### Outils
```bash
npm test              # Unit tests (Vitest)
npm run e2e          # E2E tests (Playwright)
npm run lint         # Linting (ESlint)
```

---

## 🚀 Phase 11: Déploiement (1-2 jours)

### Build
```bash
npm run build        # → dist/
```

### Déploiement
- [ ] Vérifier build produit
- [ ] Déployer frontend sur serveur
- [ ] Configurer variables d'env
- [ ] HTTPS/SSL setup
- [ ] CORS configuré

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (GA/Mixpanel)
- [ ] Performance monitoring
- [ ] Uptime monitoring

---

## ✨ Checklist finale avant prod

- [ ] Tous les messages d'erreur traduits (FR)
- [ ] Validation email/téléphone complète
- [ ] Gestion des timeouts réseau
- [ ] Refresh token expiry handled
- [ ] Détection utilisateur hors ligne
- [ ] Pas de console.error/logs en prod
- [ ] API credentials sécurisés (env)
- [ ] CORS configuration correcte
- [ ] Rate limiting appliqué
- [ ] Audit sécurité passé
- [ ] Performance lighthouse > 90
- [ ] SEO meta tags
- [ ] 404 page personnalisée
- [ ] Terms & Privacy pages

---

## 📈 Métriques de succès

Avant de considérer le project "DONE":

### Performance
- [ ] Lighthouse Score: 85+
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] CLS < 0.1

### Qualité
- [ ] 0 console errors en prod
- [ ] 90%+ test coverage
- [ ] 0 security vulnerabilities
- [ ] Accessibilité: AA minimum

### Business
- [ ] Tous les flows possibles testés
- [ ] Admin peut gérer produits
- [ ] Clients peuvent passer commandes
- [ ] Paiement Wave fonctionnel
- [ ] Suivi livraison en temps réel

---

## 🎯 Timeline estimée

| Phase | Durée | Statut |
|-------|-------|--------|
| 0 - Setup | 1h | ⏳ EN COURS |
| 1 - Auth | 1-2j | ⏸️ À FAIRE |
| 2 - Catalogue | 1-2j | ⏸️ À FAIRE |
| 3 - Panier | 2-3j | ⏸️ À FAIRE |
| 4 - Paiement | 2-3j | ⏸️ À FAIRE |
| 5 - Commandes | 1-2j | ⏸️ À FAIRE |
| 6 - Profil | 1j | ⏸️ À FAIRE |
| 7 - Admin | 2-3j | ⏸️ À FAIRE |
| 8 - Notifications | 1-2j | ⏸️ À FAIRE |
| 9 - Polish | 2-3j | ⏸️ À FAIRE |
| 10 - Tests | 3-5j | ⏸️ À FAIRE |
| 11 - Deploy | 1-2j | ⏸️ À FAIRE |
| **TOTAL** | **20-32j** | **~5 semaines** |

---

## 🎊 Félicitations!

Vous avez une base solide pour démarrer! 🚀

Prochaine étape: **Mettre à jour Node.js et lancer `npm start`**

```bash
nvm install 20
nvm use 20
cd ~/Bureau/market-frontend
npm install
npm start
```

Accédez à: **http://localhost:4200** 🎉

---

*Bon développement! Vous allez créer quelque chose d'incroyable! 💪*
