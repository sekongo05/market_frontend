import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = false;

  constructor() {
    document.documentElement.classList.remove('dark');
  }
}
