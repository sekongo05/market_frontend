import { ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, RenderMode } from '@angular/ssr';

export const config: ApplicationConfig = {
  providers: [
    provideServerRendering(
      withRoutes([
        // Pages privées : rendu client uniquement (pas d'indexation)
        { path: 'auth/**',      renderMode: RenderMode.Client },
        { path: 'profile',      renderMode: RenderMode.Client },
        { path: 'orders/**',    renderMode: RenderMode.Client },
        { path: 'admin/**',     renderMode: RenderMode.Client },
        { path: 'manager/**',   renderMode: RenderMode.Client },
        // Pages statiques : prérendues au build → HTML immédiat pour Google
        { path: '',             renderMode: RenderMode.Prerender },
        { path: 'help',         renderMode: RenderMode.Prerender },
        { path: 'privacy',      renderMode: RenderMode.Prerender },
        { path: 'authenticity', renderMode: RenderMode.Prerender },
        { path: 'returns',      renderMode: RenderMode.Prerender },
        // Pages dynamiques (catalogue, fiches produit) : SSR à la demande
        { path: '**',           renderMode: RenderMode.Server  },
      ])
    ),
  ],
};
