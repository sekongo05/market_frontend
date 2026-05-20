import { ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, RenderMode } from '@angular/ssr';

export const config: ApplicationConfig = {
  providers: [
    provideServerRendering(
      withRoutes([
        { path: 'auth/**',    renderMode: RenderMode.Client },
        { path: 'profile',   renderMode: RenderMode.Client },
        { path: 'orders/**', renderMode: RenderMode.Client },
        { path: 'admin/**',  renderMode: RenderMode.Client },
        { path: 'manager/**',renderMode: RenderMode.Client },
        { path: '**',        renderMode: RenderMode.Server  },
      ])
    ),
  ],
};
