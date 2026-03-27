# Guide d'intégration - Panier et Paiement

## 🛒 Service de Panier

Le `CartService` gère un panier local stocké dans `localStorage`.

### Utilisation

```typescript
import { CartService, CartItem } from '@core/services';

export class ProductDetailComponent {
  constructor(private cartService: CartService) {}

  addToCart() {
    const item: CartItem = {
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
    };
    
    this.cartService.addToCart(item);
  }

  removeFromCart(productId: number) {
    this.cartService.removeFromCart(productId);
  }

  updateQuantity(productId: number, quantity: number) {
    this.cartService.updateQuantity(productId, quantity);
  }

  get cart$() {
    return this.cartService.cart$;
  }

  getTotalPrice(): number {
    return this.cartService.getTotalPrice();
  }
}
```

### Template

```html
<div *ngFor="let item of (cart$ | async)">
  <p>{{ item.productName }}</p>
  <p>{{ item.price }} XOF</p>
  <input [(ngModel)]="item.quantity" (ngModelChange)="updateQuantity(item.productId, $event)" />
  <button (click)="removeFromCart(item.productId)">Supprimer</button>
</div>

<p>Total: {{ getTotalPrice() | number: '0.0' }} XOF</p>
```

## 💳 Intégration Paiement Wave CI

### 1. Créer une commande

```typescript
import { OrderService } from '@core/services';
import { CreateOrderRequest } from '@core/models';

export class CheckoutComponent {
  constructor(
    private orderService: OrderService,
    private paymentService: PaymentService,
    private cartService: CartService
  ) {}

  checkout() {
    const items = this.cartService.getCart().map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }));

    const orderData: CreateOrderRequest = {
      items,
      deliveryAddress: this.deliveryAddress
    };

    this.orderService.createOrder(orderData).subscribe(response => {
      if (response.success) {
        const orderId = response.data.id;
        this.initiatePayment(orderId);
      }
    });
  }
}
```

### 2. Appeler le webhook de paiement

```typescript
export class CheckoutComponent {
  initiatePayment(orderId: number) {
    const successUrl = `${window.location.origin}/payment-success`;
    const errorUrl = `${window.location.origin}/payment-error`;

    this.paymentService
      .initiateWavePayment(orderId, successUrl, errorUrl)
      .subscribe(response => {
        if (response.success) {
          // Rediriger vers Wave
          window.location.href = response.data.paymentUrl;
        }
      });
  }
}
```

### 3. Gérer les réponses de paiement

```typescript
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-md mx-auto mt-20">
      <div class="text-center">
        <div class="text-6xl mb-4">✅</div>
        <h1 class="text-2xl font-bold mb-4">Paiement réussi!</h1>
        <p class="text-gray-600 mb-8">Commande: {{ orderNumber }}</p>
        <a routerLink="/orders" class="bg-blue-600 text-white px-6 py-2 rounded">
          Voir mes commandes
        </a>
      </div>
    </div>
  `
})
export class PaymentSuccessComponent implements OnInit {
  orderNumber: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const orderId = params['orderId'];
      if (orderId) {
        this.orderService.getOrderById(orderId).subscribe(response => {
          if (response.success) {
            this.orderNumber = response.data.orderNumber;
          }
        });
      }
    });
  }
}
```

## 📦 Workflow complet

```
1. Utilisateur ajoute produits au panier (CartService)
2. Utilisateur remplit adresse livraison
3. Clic sur "Valider la commande"
4. POST /api/orders → Crée la commande
5. POST /api/payments/wave/initiate/{orderId} → Reçoit URL Wave
6. Redirection vers Wave.com pour paiement
7. Wave appelle webhook automatiquement après paiement
8. Commande passe à CONFIRMED
9. Redirection vers page succès
10. Utilisateur voit sa commande dans /orders
```

## 🔄 Statuts de commande

- **PENDING** - Créée, en attente de paiement
- **CONFIRMED** - Paiement reçu, prêt à être traité
- **PROCESSING** - En préparation
- **SHIPPED** - Expédiée
- **DELIVERED** - Livrée
- **CANCELLED** - Annulée

## 📝 Prochaines pages à implémenter

### Cart Page (`/cart`)
```typescript
@Component({
  selector: 'app-cart',
  standalone: true,
  template: `
    <h1>Mon Panier</h1>
    <div *ngFor="let item of (cart$ | async)">
      <!-- Afficher items -->
    </div>
    <button (click)="checkout()">Passer la commande</button>
  `
})
export class CartComponent {
  cart$ = this.cartService.cart$;
  
  constructor(private cartService: CartService) {}

  checkout() {
    // Rediriger vers checkout
  }
}
```

### Checkout Page (`/checkout`)
Formulaire pour:
- Adresse de livraison
- Informations de contact
- Résumé panier
- Bouton "Payer avec Wave"

### Payment Pages
- `/payment-success` - Succès du paiement
- `/payment-error` - Erreur du paiement

## 🚀 Configuration Wave CI

1. Créer compte Wave (https://wave.com)
2. Obtenir les identifiants API
3. Ajouter dans `environment.ts`:
   ```typescript
   export const environment = {
     wave: {
       apiKey: 'votre-api-key',
       businessId: 'votre-business-id'
     }
   };
   ```

## 🧪 Test

```bash
# Test local avec mock backend
npm start

# Accéder à:
# - http://localhost:4200/products (Ajouter au panier)
# - http://localhost:4200/cart (Voir panier)
# - http://localhost:4200/checkout (Passer commande)
# - http://localhost:4200/payment-success (Après paiement)
```

---

Besoin d'aide? Consultez les autres fichiers de documentation!
