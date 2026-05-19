import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = false;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      document.documentElement.classList.remove('dark');
    }
  }
}
