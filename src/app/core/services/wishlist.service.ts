import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private readonly storageKey = 'sdm_wishlist_ids';
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly idsSubject = new BehaviorSubject<Set<number>>(this.load());

  readonly favoriteIds$ = this.idsSubject.asObservable();

  get favoriteIds(): Set<number> {
    return this.idsSubject.value;
  }

  isFavorite(productId: number): boolean {
    return this.idsSubject.value.has(productId);
  }

  toggle(productId: number): boolean {
    const next = new Set(this.idsSubject.value);
    const added = !next.has(productId);
    if (added) {
      next.add(productId);
    } else {
      next.delete(productId);
    }
    this.save(next);
    this.idsSubject.next(next);
    return added;
  }

  clear(): void {
    const empty = new Set<number>();
    this.save(empty);
    this.idsSubject.next(empty);
  }

  private load(): Set<number> {
    if (!this.isBrowser) return new Set<number>();
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return new Set<number>();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set<number>();
      return new Set(parsed.filter((id): id is number => typeof id === 'number'));
    } catch {
      return new Set<number>();
    }
  }

  private save(ids: Set<number>): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify([...ids]));
    } catch {
      // Ignore storage quota errors
    }
  }
}

