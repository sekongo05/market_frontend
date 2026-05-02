import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScrollLockService {
  private count = 0;
  private savedY = 0;

  lock(): void {
    if (this.count === 0) {
      this.savedY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.savedY}px`;
      document.body.style.width = '100%';
    }
    this.count++;
  }

  unlock(): void {
    if (this.count > 0) this.count--;
    if (this.count === 0) {
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('width');
      window.scrollTo({ top: this.savedY, behavior: 'instant' as ScrollBehavior });
    }
  }

  forceUnlock(): void {
    this.count = 0;
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    window.scrollTo({ top: this.savedY, behavior: 'instant' as ScrollBehavior });
  }
}
