import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  currentUser$;
  isDark$;

  statProducts = 0;
  statBrands   = 0;
  statClients  = 0;

  private _observer?: IntersectionObserver;
  private _statsAnimated = false;

  constructor(
    private authService: AuthService,
    readonly themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.isDark$ = this.themeService.isDark$;
  }

  ngAfterViewInit(): void {
    this._initObserver();
  }

  ngOnDestroy(): void {
    this._observer?.disconnect();
  }

  toggleTheme(): void {
    this.themeService.toggle();
    this.cdr.detectChanges();
  }

  private _initObserver(): void {
    this._observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        if (entry.target.id === 'stats-row' && !this._statsAnimated) {
          this._statsAnimated = true;
          this._count('statProducts', 500,  2400);
          this._count('statBrands',   15,   1500);
          this._count('statClients',  1200, 2800);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.scroll-reveal').forEach(el => this._observer!.observe(el));
    const stats = document.getElementById('stats-row');
    if (stats) this._observer.observe(stats);
  }

  private _count(prop: 'statProducts'|'statBrands'|'statClients', target: number, ms: number): void {
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      (this as any)[prop] = Math.round((1 - Math.pow(1 - p, 4)) * target);
      this.cdr.detectChanges();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
