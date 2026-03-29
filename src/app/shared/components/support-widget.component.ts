import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

declare global {
  interface Window {
    Tawk_API?: {
      maximize: () => void;
      minimize: () => void;
      hideWidget: () => void;
      showWidget: () => void;
      setAttributes: (attrs: Record<string, string>, cb?: (err: unknown) => void) => void;
      onLoad?: () => void;
    };
  }
}

@Component({
  selector: 'app-support-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      <!-- Options (visibles quand ouvert) -->
      @if (open) {
        <div class="flex flex-col items-end gap-2.5 support-menu">

          <!-- WhatsApp -->
          <div class="flex items-center gap-3">
            <span class="px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-lg"
                  style="background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);">
              WhatsApp
            </span>
            <a [href]="whatsappUrl" target="_blank" rel="noopener"
               class="rounded-2xl flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
               style="background:#25D366;width:52px;height:52px;">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>

          <!-- Chat en direct -->
          <div class="flex items-center gap-3">
            <span class="px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-lg"
                  style="background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);">
              Chat en direct
            </span>
            <button (click)="openChat()"
               class="rounded-2xl flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
               style="background:#6366f1;width:52px;height:52px;">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </button>
          </div>

        </div>
      }

      <!-- Bouton principal -->
      <button (click)="toggle()"
        class="rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 relative"
        style="background:linear-gradient(135deg,#d4af37,#b8960c);width:56px;height:56px;"
        [title]="open ? 'Fermer' : 'Service client'">

        <span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"
              [class.animate-pulse]="!open" [class.hidden]="open"></span>

        @if (open) {
          <svg class="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        } @else {
          <svg class="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
        }
      </button>

    </div>
  `,
  styles: [`
    .support-menu {
      animation: slideUp 0.2s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class SupportWidgetComponent implements OnInit {
  open = false;

  readonly whatsappUrl = 'https://wa.me/2250153761320?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20pour%20ma%20commande%20ChronoLux.';

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    // Dès que l'utilisateur est connecté, on identifie le visiteur dans Tawk.to
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.identifyVisitor();
      }
    });
  }

  toggle(): void {
    this.open = !this.open;
  }

  openChat(): void {
    if (window.Tawk_API) {
      window.Tawk_API.maximize();
    }
    this.open = false;
  }

  private identifyVisitor(): void {
    this.apiService.get<Record<string, string>>('/users/me/tawk-hash').subscribe({
      next: (res: any) => {
        if (!res.success || !window.Tawk_API) return;
        const { name, email, hash } = res.data;

        const applyAttributes = () => {
          const attrs: Record<string, string> = { name, email };
          if (hash) attrs['hash'] = hash;
          window.Tawk_API!.setAttributes(attrs, () => {});
        };

        // Tawk.to est peut-être pas encore chargé — on attend le onLoad
        if (typeof window.Tawk_API.setAttributes === 'function') {
          applyAttributes();
        } else {
          const existingOnLoad = window.Tawk_API.onLoad;
          window.Tawk_API.onLoad = () => {
            existingOnLoad?.();
            applyAttributes();
          };
        }
      },
      error: () => {} // silencieux si non connecté
    });
  }
}
