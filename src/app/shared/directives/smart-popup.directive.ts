import {
  Directive,
  ElementRef,
  Input,
  AfterViewInit,
  OnDestroy,
  Renderer2,
  NgZone,
} from '@angular/core';

/**
 * Positionne automatiquement un popup (position:absolute) au-dessus ou
 * en-dessous de son ancre selon l'espace disponible dans le viewport.
 *
 * Usage :
 *   <div class="absolute right-0" appSmartPopup>…</div>
 *
 * L'élément hôte doit être `position: absolute` dans un parent `position: relative`.
 * La directive gère top/bottom et max-height en fonction de l'espace restant.
 */
@Directive({
  selector: '[appSmartPopup]',
  standalone: true,
})
export class SmartPopupDirective implements AfterViewInit, OnDestroy {
  /** Marge entre l'ancre et le popup (px). */
  @Input() popupGap = 12;
  /** Marge de sécurité bord de viewport (px). */
  @Input() popupEdge = 8;
  /** max-height minimum garanti même si l'espace est faible (px). */
  @Input() popupMinH = 180;

  private _observer?: ResizeObserver;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private zone: NgZone,
  ) {}

  ngAfterViewInit(): void {
    this._apply();

    if (typeof ResizeObserver !== 'undefined') {
      this._observer = new ResizeObserver(() =>
        this.zone.run(() => this._apply()),
      );
      this._observer.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this._observer?.disconnect();
  }

  private _apply(): void {
    const popup  = this.el.nativeElement;
    const anchor = popup.parentElement;
    if (!anchor) return;

    const rect  = anchor.getBoundingClientRect();
    const vh    = window.innerHeight;
    const gap   = this.popupGap;
    const edge  = this.popupEdge;

    const spaceBelow = vh - rect.bottom - gap - edge;
    const spaceAbove = rect.top       - gap - edge;

    const openDown = spaceBelow >= spaceAbove;
    const maxH     = Math.max(openDown ? spaceBelow : spaceAbove, this.popupMinH);

    if (openDown) {
      this.renderer.setStyle(popup, 'top',    `calc(100% + ${gap}px)`);
      this.renderer.setStyle(popup, 'bottom', 'auto');
    } else {
      this.renderer.setStyle(popup, 'bottom', `calc(100% + ${gap}px)`);
      this.renderer.setStyle(popup, 'top',    'auto');
    }

    this.renderer.setStyle(popup, 'max-height', `${maxH}px`);

    // Correction dépassement horizontal — une frame après rendu
    requestAnimationFrame(() => {
      if (!popup.isConnected) return;
      const vw  = window.innerWidth;
      const box = popup.getBoundingClientRect();
      if (box.right > vw - edge) {
        this.renderer.setStyle(popup, 'right', '0');
        this.renderer.removeStyle(popup, 'left');
      } else if (box.left < edge) {
        this.renderer.setStyle(popup, 'left', '0');
        this.renderer.removeStyle(popup, 'right');
      }
    });
  }
}
