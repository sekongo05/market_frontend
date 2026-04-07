import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen theme-bg flex flex-col items-center justify-center px-4 text-center">

      <!-- Numéro -->
      <div class="relative mb-6 select-none">
        <p class="text-[clamp(7rem,20vw,12rem)] font-black leading-none"
           style="color:rgba(184,148,30,0.12);">404</p>
        <div class="absolute inset-0 flex items-center justify-center">
          <p class="text-[clamp(4rem,12vw,7rem)] font-black leading-none"
             style="color:#b8941e;">404</p>
        </div>
      </div>

      <!-- Texte -->
      <h1 class="text-2xl sm:text-3xl font-black theme-text mb-3">Page introuvable</h1>
      <p class="theme-muted text-sm sm:text-base max-w-sm leading-relaxed mb-10">
        Cette page n'existe pas ou a été déplacée. Retournez à l'accueil pour continuer vos achats.
      </p>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3">
        <a routerLink="/"
           class="px-7 py-3.5 rounded-2xl font-bold text-sm text-black hover:-translate-y-0.5
                  hover:shadow-xl hover:shadow-yellow-600/25 transition-all duration-300"
           style="background:#b8941e;">
          Retour à l'accueil
        </a>
        <a routerLink="/products"
           class="px-7 py-3.5 rounded-2xl font-bold text-sm border transition-all duration-300
                  theme-border theme-muted hover:text-gold hover:border-gold/40">
          Explorer la boutique
        </a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
