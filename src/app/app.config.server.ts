import { ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, RenderMode } from '@angular/ssr';

export const config: ApplicationConfig = {
  providers: [
    provideServerRendering(
      withRoutes([
        { path: '**', renderMode: RenderMode.Client },
      ])
    ),
  ],
};
