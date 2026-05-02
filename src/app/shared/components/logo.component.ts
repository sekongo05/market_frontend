import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-3">
      <!-- Logo -->
      <div class="flex items-center" [ngClass]="sizeClass">
        <div class="bg-[#1c1c1c] rounded-[5px] flex items-center justify-center px-[0.4em] py-[0.12em]">
          <span class="font-black tracking-tight leading-none" style="color:#b8941e">SDM</span>
        </div>
        <span class="font-black tracking-tight leading-none ml-[0.22em]" style="color:#111111">STORE</span>
      </div>
      <!-- Séparateur + Slogan -->
      <div class="flex flex-col justify-center border-l border-[#b8941e]/40 pl-3">
        <span class="text-[10px] font-semibold tracking-widest uppercase leading-none"
              style="color:#b8941e">L'excellence</span>
        <span class="text-[10px] font-semibold tracking-widest uppercase leading-none mt-0.5" style="color:#6b7280">à prix juste</span>
      </div>
    </div>
  `,
})
export class LogoComponent {
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  get sizeClass(): string {
    return { sm: 'text-base', md: 'text-xl', lg: 'text-2xl', xl: 'text-3xl' }[this.size];
  }
}
