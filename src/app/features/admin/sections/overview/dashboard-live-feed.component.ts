import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LiveActivityEvent } from './dashboard-smart.models';
import { timeAgo } from '../../shared/admin-status.helpers';

@Component({
  selector: 'app-dashboard-live-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="luxury-card border theme-border rounded-3xl p-5 md:p-6 flex flex-col relative overflow-hidden h-full">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2.5">
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <h3 class="text-sm font-bold theme-text uppercase tracking-widest">
            Flux Direct (Temps Réel)
          </h3>
        </div>
        <span class="text-[10px] font-bold theme-muted bg-black/[.04] px-2 py-0.5 rounded-lg border theme-border">
          STOMP Live
        </span>
      </div>

      <div class="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-1 flex-1">
        @if (events.length > 0) {
          @for (event of events; track event.id) {
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-black/[.02] border theme-border hover:bg-black/[.04] transition-colors">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-sm" [ngClass]="event.badgeClass">
                @switch (event.iconType) {
                  @case ('order') {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                  }
                  @case ('stock') {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  }
                  @case ('return') {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                  }
                  @default {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  }
                }
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-bold theme-text truncate">{{ event.title }}</p>
                  <span class="text-[10px] theme-muted shrink-0">{{ formatTime(event.timestamp) }}</span>
                </div>
                <p class="text-[11px] theme-muted mt-0.5 line-clamp-1">{{ event.detail }}</p>
              </div>
            </div>
          }
        } @else {
          <div class="flex flex-col items-center justify-center py-10 text-center">
            <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
              <svg class="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <p class="text-xs font-bold theme-text">En attente d'événements...</p>
            <p class="text-[10px] theme-muted mt-0.5">Les nouvelles commandes et mouvements s'afficheront en temps réel.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class DashboardLiveFeedComponent {
  @Input() events: LiveActivityEvent[] = [];
  readonly timeAgo = timeAgo;

  formatTime(date: Date): string {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  }
}
