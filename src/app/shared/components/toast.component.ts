import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService, Toast } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      @for (toast of toasts; track toast.id) {
        <div class="pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl
                    border animate-slide-up text-sm font-semibold backdrop-blur-sm"
             [ngClass]="styleFor(toast.type)">
          <!-- Icon -->
          <div class="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center"
               [ngClass]="iconBgFor(toast.type)">
            @if (toast.type === 'success') {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            } @else if (toast.type === 'error') {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            }
          </div>
          <!-- Message -->
          <span class="flex-1">{{ toast.message }}</span>
          <!-- Close -->
          <button (click)="toastService.dismiss(toast.id)"
            class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-lg
                   opacity-50 hover:opacity-100 transition-opacity">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }
    .animate-slide-up { animation: slide-up 0.22s ease-out forwards; }
  `],
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    readonly toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.toastService.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(t => { this.toasts = t; this.cdr.detectChanges(); });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  styleFor(type: Toast['type']): string {
    switch (type) {
      case 'success': return 'bg-[#0f1f12]/95 border-green-500/30 text-green-300';
      case 'error':   return 'bg-[#1f0f0f]/95 border-red-500/30   text-red-300';
      default:        return 'bg-[#0f1218]/95 border-blue-500/30  text-blue-300';
    }
  }

  iconBgFor(type: Toast['type']): string {
    switch (type) {
      case 'success': return 'bg-green-500/20 text-green-400';
      case 'error':   return 'bg-red-500/20   text-red-400';
      default:        return 'bg-blue-500/20  text-blue-400';
    }
  }
}
