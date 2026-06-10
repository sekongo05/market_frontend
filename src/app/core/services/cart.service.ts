import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string;
  maxStock: number;
  variantId?: number;
  selectedColor?: string;
  selectedColorHex?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly cartKey = 'market_cart';
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private cartSubject = new BehaviorSubject<CartItem[]>(this.loadCart());
  public cart$ = this.cartSubject.asObservable();
  get cartValue(): CartItem[] { return this.cartSubject.value; }

  private _lastAdded = new Subject<CartItem>();
  readonly lastAdded$ = this._lastAdded.asObservable();

  constructor() {}

  addToCart(item: CartItem): void {
    const cart = this.cartSubject.value;
    const existingItem = cart.find(
      (i) => i.productId === item.productId && i.variantId === item.variantId
    );

    if (existingItem) {
      existingItem.quantity = Math.min(existingItem.quantity + item.quantity, item.maxStock);
      existingItem.maxStock = item.maxStock;
    } else {
      cart.push({ ...item, quantity: Math.min(item.quantity, item.maxStock) });
    }

    this.saveCart(cart);
    this.cartSubject.next([...cart]);
    this._lastAdded.next(item);
  }

  removeFromCart(productId: number, variantId?: number): void {
    const cart = this.cartSubject.value.filter(
      (item) => !(item.productId === productId && item.variantId === variantId)
    );
    this.saveCart(cart);
    this.cartSubject.next(cart);
  }

  updateQuantity(productId: number, quantity: number, variantId?: number): void {
    const cart = this.cartSubject.value;
    const item = cart.find((i) => i.productId === productId && i.variantId === variantId);

    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(productId, variantId);
      } else {
        item.quantity = Math.min(quantity, item.maxStock);
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
    if (!this.isBrowser) return [];
    try {
      const cart = localStorage.getItem(this.cartKey);
      return cart ? JSON.parse(cart) : [];
    } catch (e) {
      console.error('Error loading cart', e);
      return [];
    }
  }

  private saveCart(cart: CartItem[]): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.cartKey, JSON.stringify(cart));
  }
}
