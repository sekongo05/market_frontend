import { Injectable, signal } from '@angular/core';

export interface WaContext { name: string; price: number; id: number; }

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private readonly phone = '2250574830505';
  readonly context = signal<WaContext | null>(null);

  buildUrl(): string {
    const ctx = this.context();
    const msg = ctx
      ? `Bonjour SDM STORE 👋\nJe suis intéressé(e) par ce produit :\n\n🛍️ ${ctx.name}\n💰 ${ctx.price.toLocaleString('fr-FR')} FCFA\n\nPouvez-vous m'aider ?`
      : `Bonjour SDM STORE 👋, je suis intéressé(e) par un de vos produits. Pouvez-vous m'aider ?`;
    return `https://wa.me/${this.phone}?text=${encodeURIComponent(msg)}`;
  }
}
