# SDM Store — Frontend Documentation

## Overview

Application e-commerce SDM Store — frontend Angular avec SSR (Server-Side Rendering). Cible le marché ivoirien (FCFA), interface gold/thème luxe, responsive mobile-first.

## Tech Stack

| Stack | Version |
|---|---|
| Angular | ^21.2.0 |
| TypeScript | ~5.9.2 |
| Node.js | 20+ |
| SSR | @angular/ssr ^21.2.5 |
| CSS | Tailwind CSS v4 |
| WebSocket | @stomp/stompjs ^7.3.0 |
| Tests | Vitest ^4.0.8 |
| Build | @angular/build ^21.2.3 |

## Structure du projet

```
src/
├── main.ts                           # Entry point browser
├── main.server.ts                    # Entry point SSR
├── index.html                        # Root HTML (SEO: OG, Twitter, JSON-LD)
├── styles.css                        # Tailwind v4 + thème gold + animations
├── app/
│   ├── app.component.ts              # Root component (standalone)
│   ├── app.config.ts                 # Providers (router, HTTP, interceptors, locale)
│   ├── app.config.server.ts          # SSR render modes
│   ├── app.routes.ts                 # Routes principales
│   ├── home.component.ts             # Page d'accueil
│   │
│   ├── core/
│   │   ├── constants.ts              # Constantes globales
│   │   ├── guards/
│   │   │   ├── auth.guard.ts         # Vérifie auth token
│   │   │   └── role.guard.ts         # Vérifie UserRole
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts   # Ajoute Bearer token
│   │   │   └── error.interceptor.ts  # Gère 401, refresh token
│   │   ├── models/                   # Interfaces TypeScript (15 fichiers)
│   │   │   ├── auth.models.ts
│   │   │   ├── product.models.ts
│   │   │   ├── order.models.ts
│   │   │   ├── category.models.ts
│   │   │   ├── common.models.ts      # ApiResponse<T>, PageResponse<T>, énums
│   │   │   └── ... (stock, promo, review, supplier, etc.)
│   │   └── services/                 # Services métier (31)
│   │       ├── api.service.ts        # HTTP core avec ETag + TTL cache
│   │       ├── auth.service.ts       # JWT, refresh, login/register
│   │       ├── websocket.service.ts  # STOMP WebSocket
│   │       ├── cart.service.ts       # Panier localStorage
│   │       ├── seo.service.ts        # Meta tags dynamiques
│   │       └── ... (product, order, category, stock, promo, review, etc.)
│   │
│   ├── features/                     # Modules fonctionnels (lazy-loaded)
│   │   ├── admin/                    # /admin — ADMIN only (13 sections)
│   │   ├── manager/                  # /manager — MANAGER/ADMIN (4 sections)
│   │   ├── auth/                     # /auth/login, register, forgot/reset-password
│   │   ├── products/                 # /products, /products/:id
│   │   ├── orders/                   # /orders, /checkout
│   │   ├── profile/                  # /profile (info, adresses, sécurité)
│   │   ├── help/                     # /help
│   │   ├── privacy/                  # /privacy
│   │   ├── authenticity/             # /qualite
│   │   ├── returns/                  # /returns
│   │   └── not-found/
│   │
│   └── shared/                       # Composants réutilisables
│       ├── components/
│       │   ├── layout.component.ts   # Layout principal (navbar + footer)
│       │   ├── navbar.component.ts   # Navigation responsive
│       │   ├── toast.component.ts    # Notifications toast
│       │   ├── auth-prompt.component.ts
│       │   └── logo.component.ts
│       ├── directives/
│       │   ├── smart-popup.directive.ts
│       │   └── tooltip.directive.ts
│       └── pipes/
│           ├── media-url.pipe.ts     # Transforme URL média
│           └── notif-body.pipe.ts    # Formate corps notification
```

## Routing

| Route | Composant | Guard | SSR |
|---|---|---|---|
| `/` | Home | — | Prerendered |
| `/products` | Products | — | Dynamic |
| `/products/:id` | ProductDetail | — | Dynamic |
| `/auth/login` | Login | — | Client only |
| `/auth/register` | Register | — | Client only |
| `/auth/forgot-password` | ForgotPassword | — | Client only |
| `/auth/reset-password` | ResetPassword | — | Client only |
| `/orders` | Orders | authGuard | Client only |
| `/checkout` | Checkout | authGuard | Client only |
| `/profile` | Profile | authGuard | Client only |
| `/admin/**` | (13 sections) | authGuard + roleGuard ADMIN | Client only |
| `/manager/**` | (4 sections) | authGuard + roleGuard MANAGER/ADMIN | Client only |
| `/help` | Help | — | Prerendered |
| `/privacy` | Privacy | — | Prerendered |
| `/qualite` | Authenticity | — | Prerendered |
| `/returns` | Returns | — | Prerendered |
| `**` | NotFound | — | — |

**Strategy** : `PreloadAllModules` (tous les modules sont préchargés après le chargement initial)

## Services Clés

### ApiService (`core/services/api.service.ts`)
- Wrapper HTTP central pour tous les appels API
- **Cache intelligent** : ETag (`If-None-Match`) + TTL mémoire (30s par défaut, lit `max-age` du header `Cache-Control`)
- **Retry** : 2 tentatives avec délai 1s, sauf 401/403/404/422
- **Timeout** : 15s
- Les méthodes mutantes (POST, PUT, PATCH, DELETE) vident tous les caches
- Utilise `environment.apiUrl` comme base URL

### AuthService (`core/services/auth.service.ts`)
- JWT token + refresh token dans `localStorage`
- Rafraîchissement proactif toutes les 25 minutes
- À la connexion : connecte le WebSocket automatiquement
- Expose `currentUser$` (BehaviorSubject)

### WebSocketService (`core/services/websocket.service.ts`)
- STOMP via `@stomp/stompjs`
- Reconnection auto toutes les 5s, heartbeat 30s
- Topics :
  - Public : `/topic/stock`
  - Authentifié : `/user/queue/notifications`, `/user/queue/order-status`
  - Staff : `/topic/staff/notifications`, `/topic/staff/orders`, `/topic/staff/events`

### CartService (`core/services/cart.service.ts`)
- Panier persistant dans `localStorage` (clé: `market_cart`)
- `BehaviorSubject<CartItem[]>` pour réactivité
- Expose `lastAdded$` pour notifications toast

### Dashboard optimisé
- `admin-overview.component.ts` : parallélise 4 appels avec `forkJoin`
- `debounceTime(2000)` sur les rechargements WebSocket
- Cache HTTP via ApiService

## SSR — Server-Side Rendering

**Fichier** : `server.ts`

- Utilise `AngularNodeAppEngine` de `@angular/ssr/node`
- **Cache-Control** : `public, max-age=60, s-maxage=300` sur pages publiques
- **No cache** sur : `/admin`, `/manager`, `/auth`, `/checkout`, `/profile`, `/orders`
- Fallback 404, error handler 500
- Export `reqHandler` pour déploiement serverless (Vercel)

### Modes de rendu (`app.config.server.ts`)
| Mode | Routes |
|---|---|
| Client only | `/auth/**`, `/profile`, `/orders/**`, `/admin/**`, `/manager/**` |
| Prerendered build | `/`, `/help`, `/privacy`, `/qualite`, `/returns` |
| Dynamic SSR | Toutes les autres |

## Environnements

### Développement (`environments/environment.ts`)
```typescript
apiUrl: 'http://localhost:8080/api'
wsUrl: 'ws://localhost:8080/ws'
whatsAppNumber: '2250153761320'
```

### Production (`environments/environment.prod.ts`)
```typescript
apiUrl: 'https://market-app-backend-sx0s.onrender.com/api'
wsUrl: 'wss://market-app-backend-sx0s.onrender.com/ws'
whatsAppNumber: '2250153761320'
```

## Proxy (développement)

`proxy.conf.json` : proxy `/uploads` → `http://localhost:8080`

## Scripts

| Commande | Description |
|---|---|
| `npm start` | Serveur dev (`ng serve`) |
| `npm run build` | Build production |
| `npm run build:ssr` | Build SSR production |
| `npm run serve:ssr` | Lance SSR en local |
| `npm test` | Tests unitaires (Vitest) |

## Déploiement (Vercel)

- `vercel.json` : build → `dist/market-frontend`, SSR via `api/ssr.mjs`
- Toutes les routes non-fichiers rewrited vers la fonction SSR

## SEO

- `SeoService` : meta tags dynamiques, OG, Twitter Cards, JSON-LD, canonical URL
- `sitemap.xml` généré par le backend
- `robots.txt` : autorise tous les crawlers
- `manifest.webmanifest` : PWA
- Prerendered pages : `/`, `/help`, `/privacy`, `/qualite`, `/returns`

## Performance

- **ApiService** : Cache ETag + TTL + retry backoff
- **Dashboard** : `forkJoin` parallélisation + `debounceTime` WebSocket
- **SSR** : Cache-Control `max-age=60, s-maxage=300` sur pages publiques
- **GZIP** : Compressé côté backend
- **PreloadAllModules** : tous les modules préchargés après init
- **Scroll restoration** : `scrollPositionRestoration: 'top'`