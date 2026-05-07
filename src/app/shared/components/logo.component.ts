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
        style="background: linear-gradient(135deg, #e8c972 0%, #c9a24b 50%, #8a6d2a 100%);
               box-shadow: 0 30px 80px -30px rgba(138,109,42,.6);"
      >
        <!-- inner black disc -->
        <div class="absolute rounded-full" style="inset:3.6%; background:#0e0e10;"></div>
        <!-- inner gold ring -->
        <div class="absolute rounded-full" style="inset:6.4%; border:1px solid #c9a24b; opacity:.5;"></div>

        <!-- content -->
        <div class="relative z-10 flex flex-col items-center" [style.gap.px]="size * 0.014">
          <!-- cart icon -->
          <svg [attr.width]="size * 0.157" [attr.height]="size * 0.157"
               viewBox="0 0 48 48" [style.marginBottom.px]="size * 0.014">
            <g fill="none" stroke="#c9a24b" [attr.stroke-width]="1.8"
               stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 8 L11 8 L15 30 L38 30 L42 14 L13 14"/>
              <circle cx="17" cy="38" r="2.4" fill="#c9a24b"/>
              <circle cx="34" cy="38" r="2.4" fill="#c9a24b"/>
            </g>
          </svg>
          <!-- SDM -->
          <span class="leading-none m-0"
                style="font-family:'Bodoni Moda',serif; font-weight:800; color:#e8c972; letter-spacing:0.04em;"
                [style.fontSize.px]="size * 0.2">SDM</span>
          <!-- STORE -->
          <span class="uppercase m-0"
                style="font-family:'Inter',sans-serif; font-weight:500; color:#f5f1e8; opacity:.85; letter-spacing:0.6em; padding-left:0.6em;"
                [style.fontSize.px]="size * 0.0393"
                [style.marginTop.px]="size * 0.014">store</span>
        </div>
      </div>

      <!-- ── Slogan (masqué sur mobile) ── -->
      <div *ngIf="showSlogan"
           class=" sm:flex flex-col justify-center"
           style="border-left: 1px solid rgba(201,162,75,.35); padding-left: 0.75em;">
        <span class="block leading-none font-semibold tracking-widest uppercase"
              style="color:#c9a24b;"
              [style.fontSize.px]="size * 0.195">Le luxe</span>
        <span class="block leading-none font-medium tracking-widest uppercase"
              style="color:#9ca3af; margin-top:0.35em;"
              [style.fontSize.px]="size * 0.195">à portée de main</span>
      </div>

    </div>
  `,
})
export class SdmLogoComponent {
  @Input() size: number = 56;
  @Input() showSlogan: boolean = true;
}

export { SdmLogoComponent as LogoComponent };
