import { Injectable, signal } from '@angular/core';
import { WHATSAPP_NUMBER } from '../constants';

export interface WaContext { name: string; price: number; id: number; }

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  readonly context = signal<WaContext | null>(null);

  buildUrl(slug?: string): string {
    const ctx = this.context();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const productUrl = slug ? `${baseUrl}/products/${slug}` : '';
    const msg = ctx
      ? `Bonjour SDM STORE 👋\nJe suis intéressé(e) par ce produit :\n\n🛍️ ${ctx.name}\n💰 ${ctx.price.toLocaleString('fr-FR')} FCFA${productUrl ? `\n🔗 ${productUrl}` : ''}\n\nPouvez-vous m'aider ?`
      : `Bonjour SDM STORE 👋, je suis intéressé(e) par un de vos produits. Pouvez-vous m'aider ?`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }
}
