import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product';
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock';
  rating?: { value: number; count: number };
  jsonLd?: object;
}

const SITE_NAME = 'SDM STORE';
const BASE_URL = 'https://sdm-store.shop';
const DEFAULT_IMAGE = `${BASE_URL}/icon-512.png`;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private meta = inject(Meta);
  private title = inject(Title);
  private doc = inject(DOCUMENT);

  set(config: SeoConfig): void {
    const fullTitle = `${config.title} — ${SITE_NAME}`;
    const image = config.image || DEFAULT_IMAGE;
    const url = config.url ? `${BASE_URL}${config.url}` : BASE_URL;

    this.title.setTitle(fullTitle);

    // Standard
    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: config.type === 'product' ? 'og:product' : 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:locale', content: 'fr_CI' });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    // Canonical
    this._setCanonical(url);

    // JSON-LD
    if (config.jsonLd) {
      this._setJsonLd(config.jsonLd);
    } else {
      this._removeJsonLd();
    }
  }

  setDefault(): void {
    this.set({
      title: 'Mode, Montres & Lifestyle en Côte d\'Ivoire',
      description: 'SDM STORE : boutique en ligne de mode, montres, bijoux, beauté et lifestyle. Livraison 24–48h partout en Côte d\'Ivoire.',
    });
  }

  private _setCanonical(url: string): void {
    let link: HTMLLinkElement = this.doc.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private _setJsonLd(data: object): void {
    this._removeJsonLd();
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'json-ld-structured';
    script.textContent = JSON.stringify(data);
    this.doc.head.appendChild(script);
  }

  private _removeJsonLd(): void {
    const existing = this.doc.getElementById('json-ld-structured');
    existing?.remove();
  }
}
