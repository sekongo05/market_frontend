import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthPromptService } from '../../core/services/auth-prompt.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-auth-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <!-- Backdrop -->
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);"
           (click)="onBackdropClick($event)">

        <!-- Modale -->
        <div class="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-prompt-in"
             style="background:#ffffff;border:1px solid rgba(0,0,0,0.10)"
             (click)="$event.stopPropagation()">

          <!-- Bandeau haut doré -->
          <div class="h-1 w-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600"></div>

          <!-- Bouton fermer -->
          <button (click)="close()"
            class="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style="color:#6b7280;background:transparent"
            (mouseenter)="$event.target && setHover($event, true)"
            (mouseleave)="$event.target && setHover($event, false)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <div class="p-7">
            <!-- Icône -->
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                 style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.25)">
              <svg class="w-7 h-7" style="color:#d4af37" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>

            <!-- Texte -->
            <h2 class="text-lg font-black text-center mb-2" style="color:#111111">
              Connexion requise
            </h2>
            <p class="text-sm text-center mb-6 leading-relaxed" style="color:#6b7280">
              Vous devez être connecté pour passer une commande sur&nbsp;SDM&nbsp;STORE.
            </p>

            <!-- Boutons -->
            <div class="flex flex-col gap-3">
              <button (click)="goToLogin()"
                class="w-full py-3 rounded-xl font-black text-sm text-black transition-all duration-200
                       hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-600/20"
                style="background:linear-gradient(135deg,#d4af37,#f0c840)">
                <span class="flex items-center justify-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                  </svg>
                  Se connecter
                </span>
              </button>

              <button (click)="goToRegister()"
                class="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200
                       hover:-translate-y-0.5"
                style="background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);color:#111111"
                Créer un compte
              </button>
            </div>

            <p class="text-xs text-center mt-4" style="color:#9ca3af">
              Vos articles restent dans le panier après connexion.
            </p>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes promptIn {
      from { opacity: 0; transform: scale(0.92) translateY(12px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }
    .animate-prompt-in { animation: promptIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both; }
  `],
})
export class AuthPromptComponent implements OnInit, OnDestroy {
  visible = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authPromptService: AuthPromptService,
    private router: Router,
    readonly themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authPromptService.visible$
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => { this.visible = v; this.cdr.detectChanges(); });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  close(): void { this.authPromptService.hide(); }

  onBackdropClick(event: MouseEvent): void { this.close(); }

  goToLogin(): void {
    this.close();
    const returnUrl = this.router.url;
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
  }

  goToRegister(): void {
    this.close();
    this.router.navigate(['/auth/register']);
  }

  setHover(event: Event, on: boolean): void {
    const el = event.target as HTMLElement;
    el.style.background = on ? 'rgba(0,0,0,0.06)' : 'transparent';
  }
}
