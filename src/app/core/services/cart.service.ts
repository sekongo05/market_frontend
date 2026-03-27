import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly cartKey = 'market_cart';
  private cartSubject = new BehaviorSubject<CartItem[]>(this.loadCart());
  public cart$ = this.cartSubject.asObservable();

  constructor() {}

  addToCart(item: CartItem): void {
    const cart = this.cartSubject.value;
    const existingItem = cart.find((i) => i.productId === item.productId);

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      cart.push(item);
    }

    this.saveCart(cart);
    this.cartSubject.next([...cart]);
  }

  removeFromCart(productId: number): void {
    const cart = this.cartSubject.value.filter(
      (item) => item.productId !== productId
    );
    this.saveCart(cart);
    this.cartSubject.next(cart);
  }

  updateQuantity(productId: number, quantity: number): void {
    const cart = this.cartSubject.value;
    const item = cart.find((i) => i.productId === productId);

    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(productId);
      } else {
        item.quantity = quantity;
        this.saveCart(cart);
        this.cartSubject.next([...cart]);
      }
    }
  }

  getCart(): CartItem[] {
    return this.cartSubject.value;
  }

  getTotalPrice(): number {
    return this.cartSubject.value.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  clearCart(): void {
    this.saveCart([]);
    this.cartSubject.next([]);
  }

  private loadCart(): CartItem[] {
    try {
      const cart = localStorage.getItem(this.cartKey);
      return cart ? JSON.parse(cart) : [];
    } catch (e) {
      console.error('Error loading cart', e);
      return [];
    }
  }

  private saveCart(cart: CartItem[]): void {
    localStorage.setItem(this.cartKey, JSON.stringify(cart));
  }
}
