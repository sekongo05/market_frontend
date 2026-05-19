import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ScrollLockService implements OnDestroy {
  private locked = false;
  private savedY = 0;
  private routerSub: Subscription;

  constructor(router: Router) {
    // Libère automatiquement le scroll à chaque navigation.
    // Couvre les cas où un composant est détruit sans appeler unlock()
    // (navigation rapide, swipe retour iOS, erreur JS).
    this.routerSub = router.events
      .pipe(filter(e => e instanceof NavigationStart))
      .subscribe(() => this.forceUnlock());
  }

  lock(): void {
    if (this.locked) return;
    this.locked = true;
    this.savedY = window.scrollY;
    document.body.style.overflow  = 'hidden';
    document.body.style.position  = 'fixed';
    document.body.style.top       = `-${this.savedY}px`;
    document.body.style.width     = '100%';
  }

  unlock(): void {
    this._restore();
  }

  forceUnlock(): void {
    this._restore();
  }

  private _restore(): void {
    if (!this.locked) return;
    this.locked = false;
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    window.scrollTo({ top: this.savedY, behavior: 'instant' as ScrollBehavior });
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
  }
}
