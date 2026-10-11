import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Directive({
  selector: '[appPriceFormat]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PriceFormatDirective),
      multi: true
    }
  ]
})
export class PriceFormatDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>) {}

  writeValue(value: number | string | null): void {
    if (value === null || value === undefined || value === '') {
      this.el.nativeElement.value = '';
    } else {
      this.el.nativeElement.value = this.formatNumber(value.toString());
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Keep only digits
    const numericValue = value.replace(/\D/g, '');
    const num = parseInt(numericValue, 10);
    
    if (isNaN(num)) {
      this.onChange(null);
      this.el.nativeElement.value = '';
    } else {
      this.onChange(num);
      // Determine cursor position logic can be tricky, but basic replacement works for prices
      const formatted = this.formatNumber(numericValue);
      this.el.nativeElement.value = formatted;
    }
  }

  @HostListener('blur')
  onBlur() {
    this.onTouched();
  }

  private formatNumber(value: string): string {
    const num = value.replace(/\D/g, '');
    if (!num) return '';
    // Format with non-breaking space used by fr-FR, but we'll use normal space for input compatibility
    return Number(num).toLocaleString('fr-FR').replace(/\u202f/g, ' ');
  }
}
