import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sdm-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-2 sm:gap-4" [style.gap.px]="size * 0.4">
      <!-- ── Logo Image ── -->
      <img src="/icon-512.png" alt="SDM STORE Logo" 
           [style.width.px]="size * 2.5" 
           [style.height.px]="size * 2.5" 
           class="object-contain shrink-0" />

      <!-- ── Slogan ── -->
      <div *ngIf="showSlogan"
           class="flex flex-col justify-center h-full py-1 shrink-0"
           style="border-left: 1px solid rgba(212,175,55,0.4); padding-left: 1rem;">
        <span class="block leading-tight font-black uppercase text-[10px] sm:text-[12px]"
              style="color:#b89018; letter-spacing:0.15em;">La boutique</span>
        <span class="block leading-tight font-medium uppercase text-[9px] sm:text-[10px] theme-muted"
              style="letter-spacing:0.3em; margin-top:0.1em;">des Ivoiriens</span>
      </div>
    </div>
  `,
})
export class SdmLogoComponent {
  @Input() size: number = 56;
  @Input() showSlogan: boolean = true;
}

export { SdmLogoComponent as LogoComponent };
