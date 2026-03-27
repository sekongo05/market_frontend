# Frontend Market - Documentation

## Structure du projet

```
src/
├── app/
│   ├── core/                    # Services, modèles, guards
│   │   ├── models/              # Interfaces TypeScript
│   │   ├── services/            # Services API
│   │   ├── interceptors/        # Intercepteurs HTTP
│   │   └── guards/              # Route guards
│   ├── shared/                  # Composants partagés
│   │   └── components/          # Layout, navbar
│   ├── features/                # Modules de features
│   │   ├── auth/                # Authentification
│   │   ├── products/            # Catalogue produits
│   │   ├── orders/              # Commandes
│   │   └── admin/               # Dashboard admin
│   ├── app.ts                   # Composant racine
│   ├── app.routes.ts            # Routes principales
│   └── app.config.ts            # Configuration app
├── index.html
├── main.ts
└── styles.css                   # Styles globaux + Tailwind
```

## Installation & Démarrage

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement
npm start

# Build pour la production
npm build
```

## Services disponibles

### AuthService
- `register(data)` - Inscription nouvelle utilisateur
- `login(data)` - Connexion
- `logout()` - Déconnexion
- `isAuthenticated()` - Vérifier l'authentification
- `getCurrentUser()` - Récupérer l'utilisateur actuel
- `refreshToken()` - Renouveler le token

### ProductService
- `getProducts(params)` - Récupérer la liste des produits
- `getProductById(id)` - Récupérer un produit
- `getProductBySlug(slug)` - Récupérer un produit par slug
- `createProduct(data)` - Créer un produit (Admin/Manager)
- `updateProduct(id, data)` - Modifier un produit (Admin/Manager)
- `deleteProduct(id)` - Supprimer un produit (Admin)

### OrderService
- `createOrder(data)` - Créer une commande
- `getMyOrders(page, size)` - Récupérer les commandes de l'utilisateur
- `getOrderById(id)` - Récupérer une commande
- `getAllOrders(params)` - Récupérer toutes les commandes (Admin/Manager)
- `updateOrderStatus(id, status)` - Modifier le statut (Admin/Manager)
- `cancelOrder(id)` - Annuler une commande

### PaymentService
- `initiateWavePayment(orderId, urls)` - Initier le paiement Wave
- `getTransactionsByOrder(orderId)` - Récupérer les transactions

### DeliveryService
- `trackDelivery(trackingNumber)` - Suivre une livraison
- `getDeliveryByOrder(orderId)` - Récupérer la livraison d'une commande

### NotificationService
- `getNotifications(params)` - Récupérer les notifications
- `getUnreadCount()` - Nombre de notifications non lues
- `markAsRead(id)` - Marquer comme lu

### StockService
- `addStock(data)` - Ajouter du stock
- `adjustStock(data)` - Ajuster le stock (Admin)
- `getLowStock(threshold)` - Articles en rupture

## Pages principales

- `/` - Page d'accueil
- `/auth/login` - Connexion
- `/auth/register` - Inscription
- `/products` - Catalogue produits
- `/orders` - Mes commandes (protected)
- `/admin` - Dashboard admin (Admin/Manager)

## Configuration API

L'API est disponible à `http://localhost:8080/api`

Les intercepteurs gèrent automatiquement:
- Ajout du token Bearer aux requêtes authentifiées
- Gestion des erreurs 401 (redirection login)
- Gestion des erreurs 403 (redirection forbidden)

## Styles

Le projet utilise **TailwindCSS** pour le styling. Les styles sont définis directement dans les templates HTML avec les classes Tailwind.

Classes courantes:
- `bg-blue-600` - Fond bleu
- `text-white` - Texte blanc
- `px-4 py-2` - Padding horizontal et vertical
- `rounded-lg` - Coins arrondis
- `hover:bg-blue-700` - Effet hover
- `disabled:opacity-50` - État désactivé
- `grid grid-cols-4 gap-4` - Grille 4 colonnes

## Composants réutilisables

### NavbarComponent
Barre de navigation avec:
- Affichage du user connecté
- Menu déroulant utilisateur
- Lien vers les principales pages
- Lien de déconnexion

### LayoutComponent
Layout principal avec:
- NavbarComponent en haut
- Router outlet pour le contenu
- Classes Tailwind pour responsive

## Authentification

Le token JWT est stocké dans `localStorage` avec la clé `auth_token`.
L'authentification est gérée via:
- `AuthService` pour les appels API
- `AuthInterceptor` pour ajouter le token aux requêtes
- Guards pour protéger les routes

## Prochaines étapes

1. [ ] Implémenter le panier (Cart)
2. [ ] Page de détail produit
3. [ ] Page profil utilisateur
4. [ ] Interface admin complète
5. [ ] Intégration paiement Wave CI
6. [ ] Follow livraison en temps réel
7. [ ] Push notifications
8. [ ] Tests unitaires
