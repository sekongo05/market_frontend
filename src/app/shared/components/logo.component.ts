import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sdm-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center" [style.gap.px]="size * 0.22">

      <!-- ── Cercle badge ── -->
      <div
        class="relative rounded-full flex items-center justify-center shrink-0"
        [style.width.px]="size"
        [style.height.px]="size"
        style="background: #1f2937;"
      >
        <!-- inner black disc -->
        <div class="absolute rounded-full" style="inset:3.6%; background:#111827;"></div>
        <!-- inner ring -->
        <div class="absolute rounded-full" style="inset:6.4%; border:1px solid rgba(255,255,255,.15);"></div>

        <!-- content -->
        <div class="relative z-10 flex flex-col items-center" [style.gap.px]="size * 0.014">
          <!-- cart icon -->
          <svg [attr.width]="size * 0.157" [attr.height]="size * 0.157"
               viewBox="0 0 48 48" [style.marginBottom.px]="size * 0.014">
            <g fill="none" stroke="#9ca3af" [attr.stroke-width]="1.8"
               stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 8 L11 8 L15 30 L38 30 L42 14 L13 14"/>
              <circle cx="17" cy="38" r="2.4" fill="#9ca3af"/>
              <circle cx="34" cy="38" r="2.4" fill="#9ca3af"/>
            </g>
          </svg>
          <!-- SDM -->
          <span class="leading-none m-0"
                style="font-family:'Bodoni Moda',serif; font-weight:800; color:#f3f4f6; letter-spacing:0.04em;"
                [style.fontSize.px]="size * 0.2">SDM</span>
          <!-- STORE -->
          <span class="uppercase m-0"
                style="font-family:'Inter',sans-serif; font-weight:500; color:#d1d5db; opacity:.85; letter-spacing:0.6em; padding-left:0.6em;"
                [style.fontSize.px]="size * 0.0393"
                [style.marginTop.px]="size * 0.014">store</span>
        </div>
      </div>

      <!-- ── Slogan ── -->
      <div *ngIf="showSlogan"
           class="flex flex-col justify-center"
           style="border-left: 1px solid rgba(156,163,175,.35); padding-left: 0.75em;">
        <span class="block leading-none font-semibold tracking-widest uppercase text-[9px] sm:text-[11px]"
              style="color:#6b7280;">La boutique</span>
        <span class="block leading-none font-medium tracking-widest uppercase text-[9px] sm:text-[11px]"
              style="color:#9ca3af; margin-top:0.35em;">des Ivoiriens</span>
      </div>

    </div>
  `,
})
export class SdmLogoComponent {
  @Input() size: number = 56;
  @Input() showSlogan: boolean = true;
}

export { SdmLogoComponent as LogoComponent };
