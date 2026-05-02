import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = true;

  constructor() {
    document.documentElement.classList.add('dark');
  }
}
