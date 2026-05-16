import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-support-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible) {
      <div class="wa-widget fixed bottom-6 right-5 z-50 flex flex-col items-end gap-2">

        <!-- Bulle message (desktop uniquement) -->
        <div class="wa-bubble hidden sm:flex flex-col items-start gap-0.5
                    px-4 py-3 rounded-2xl rounded-br-sm shadow-xl max-w-[220px]"
             style="background:#fff;color:#111827;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
          <p class="text-[11px] font-black leading-tight" style="color:#111827;">Besoin d'aide ou d'infos ?</p>
          <p class="text-[10px] leading-snug" style="color:#6b7280;">
            Notre équipe répond en quelques minutes 🕐
          </p>
          <!-- Flèche bulle -->
          <div class="absolute -bottom-2 right-7 w-0 h-0"
               style="border-left:8px solid transparent;border-right:0 solid transparent;border-top:8px solid #fff;"></div>
        </div>

        <!-- Bouton principal -->
        <a [href]="waUrl" target="_blank" rel="noopener noreferrer"
           class="wa-btn flex items-center gap-3 pr-5 pl-4 shadow-2xl
                  hover:-translate-y-0.5 hover:shadow-green-500/30 active:scale-95
                  transition-all duration-300 cursor-pointer"
           style="background:#25D366;border-radius:50px;height:52px;">

          <!-- Icône WhatsApp -->
          <div class="relative flex-shrink-0">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <!-- Point vert "en ligne" -->
            <span class="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style="background:#a7f3d0;"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5"
                    style="background:#fff;border:2px solid #25D366;"></span>
            </span>
          </div>

          <!-- Texte -->
          <div class="flex flex-col leading-tight">
            <span class="text-[11px] font-black text-white tracking-wide">Commander sur WhatsApp</span>
            <span class="text-[9px] font-semibold" style="color:rgba(255,255,255,0.75);">Disponible 7j/7 · Réponse rapide</span>
          </div>
        </a>

      </div>
    }
  `,
  styles: [`
    .wa-widget { animation: wa-slide-in 0.6s cubic-bezier(0.16,1,0.3,1) 1.8s both; }

    @keyframes wa-slide-in {
      from { opacity: 0; transform: translateX(80px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .wa-bubble {
      animation: wa-bubble-in 0.5s cubic-bezier(0.16,1,0.3,1) 2.4s both;
      position: relative;
    }

    @keyframes wa-bubble-in {
      from { opacity: 0; transform: translateY(10px) scale(0.92); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .wa-btn { box-shadow: 0 8px 28px rgba(37,211,102,0.38); }
    .wa-btn:hover { box-shadow: 0 14px 40px rgba(37,211,102,0.5); }
  `]
})
export class SupportWidgetComponent {

  readonly waUrl = 'https://wa.me/2250153761320?text=Bonjour%20SDM%20STORE%20%F0%9F%91%8B%2C%20je%20suis%20int%C3%A9ress%C3%A9(e)%20par%20un%20de%20vos%20produits.%20Pouvez-vous%20m\'aider%20%3F';

  constructor(private authService: AuthService) {}

  get visible(): boolean {
    const role = this.authService.getCurrentUser()?.role;
    return role !== 'ADMIN' && role !== 'MANAGER';
  }
}
