import { Directive, Input, HostListener, ElementRef, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  @Input('appTooltip') text = '';
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

  private tooltipEl: HTMLElement | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.text) return;
    this.showTimeout = setTimeout(() => this.create(), 100);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.showTimeout) clearTimeout(this.showTimeout);
    this.destroy();
  }

  @HostListener('click')
  onClick(): void {
    this.destroy();
  }

  ngOnDestroy(): void {
    if (this.showTimeout) clearTimeout(this.showTimeout);
    this.destroy();
  }

  private create(): void {
    this.destroy();

    const tooltip = this.renderer.createElement('div');
    this.renderer.appendChild(document.body, tooltip);
    this.renderer.setAttribute(tooltip, 'role', 'tooltip');

    // Style
    Object.assign(tooltip.style, {
      position: 'fixed',
      zIndex: '9999',
      padding: '5px 10px',
      background: 'rgba(15,15,15,0.92)',
      color: '#e5e7eb',
      fontSize: '11px',
      fontWeight: '600',
      fontFamily: 'inherit',
      borderRadius: '8px',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      transition: 'opacity 0.15s ease',
      opacity: '0',
    });
    tooltip.textContent = this.text;
    this.tooltipEl = tooltip;

    // Position
    requestAnimationFrame(() => {
      if (!this.tooltipEl) return;
      const rect = this.el.nativeElement.getBoundingClientRect();
      const tw = this.tooltipEl.offsetWidth;
      const th = this.tooltipEl.offsetHeight;
      const gap = 6;
      let top = 0, left = 0;

      switch (this.tooltipPosition) {
        case 'top':
          top = rect.top - th - gap;
          left = rect.left + (rect.width - tw) / 2;
          break;
        case 'left':
          top = rect.top + (rect.height - th) / 2;
          left = rect.left - tw - gap;
          break;
        case 'right':
          top = rect.top + (rect.height - th) / 2;
          left = rect.right + gap;
          break;
        default: // bottom
          top = rect.bottom + gap;
          left = rect.left + (rect.width - tw) / 2;
      }

      // Keep inside viewport
      left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
      top  = Math.max(8, Math.min(top,  window.innerHeight - th - 8));

      this.tooltipEl.style.top  = `${top}px`;
      this.tooltipEl.style.left = `${left}px`;
      this.tooltipEl.style.opacity = '1';
    });
  }

  private destroy(): void {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }
  }
}
