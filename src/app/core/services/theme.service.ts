import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _dark = new BehaviorSubject<boolean>(true);
  isDark$ = this._dark.asObservable();

  constructor() {
    const saved = localStorage.getItem('market-theme');
    const isDark = saved !== null ? saved === 'dark' : true;
    this._dark.next(isDark);
    this._apply(isDark);
  }

  toggle(): void {
    const next = !this._dark.value;
    this._dark.next(next);
    localStorage.setItem('market-theme', next ? 'dark' : 'light');
    this._apply(next);
  }

  get isDark(): boolean { return this._dark.value; }

  private _apply(dark: boolean): void {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
  }
}
