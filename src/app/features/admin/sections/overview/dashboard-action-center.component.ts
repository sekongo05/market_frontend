import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SmartActionItem } from './dashboard-smart.models';

@Component({
  selector: 'app-dashboard-action-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    @if (actions.length > 0) {
      <div class="luxury-card border theme-border rounded-3xl p-5 md:p-6 relative overflow-hidden shadow-xl">
        <!-- Ambiance background glow -->
        <div class="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10">
          <div class="flex items-center gap-3">
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div>
              <h2 class="text-base font-black theme-text tracking-wide uppercase flex items-center gap-2">
                Centre d'Action Intelligent
                <span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                  {{ actions.length }} priorité{{ actions.length > 1 ? 's' : '' }}
                </span>
              </h2>
              <p class="text-xs theme-muted">Urgences opérationnelles détectées nécessitant votre intervention.</p>
            </div>
          </div>

          <!-- Filtres de sévérité -->
          <div class="flex items-center gap-1.5 bg-black/[.04] p-1 rounded-2xl border theme-border text-xs font-bold">
            <button
              (click)="filter = 'ALL'"
              [class]="filter === 'ALL' ? 'bg-gold text-black shadow-sm' : 'theme-muted hover:text-white'"
              class="px-2.5 py-1 rounded-xl transition-all">
              Toutes ({{ actions.length }})
            </button>
            <button
              (click)="filter = 'CRITICAL'"
              [class]="filter === 'CRITICAL' ? 'bg-red-500 text-white shadow-sm' : 'theme-muted hover:text-red-400'"
              class="px-2.5 py-1 rounded-xl transition-all">
              Critiques ({{ criticalCount }})
            </button>
          </div>
        </div>

        <!-- Cartes d'action en grille responsive -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 relative z-10">
          @for (item of filteredActions; track item.id) {
            <div
              class="group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg"
              [ngClass]="getCardClasses(item.severity)">
              
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span
                    class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border"
                    [ngClass]="getBadgeClasses(item.severity)">
                    {{ getSeverityLabel(item.severity) }}
                  </span>
                  @if (item.metric) {
                    <span class="text-xs font-mono font-bold" [ngClass]="getMetricClasses(item.severity)">
                      {{ item.metric }}
                    </span>
                  }
                </div>

                <h3 class="text-sm font-bold theme-text leading-snug group-hover:text-gold transition-colors">
                  {{ item.title }}
                </h3>
                <p class="text-xs theme-muted mt-1 leading-relaxed line-clamp-2">
                  {{ item.description }}
                </p>
              </div>

              <div class="mt-4 pt-3 border-t border-black/5 flex items-center justify-between gap-2">
                <span class="text-[11px] font-bold theme-muted flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Action requise
                </span>

                <a
                  [routerLink]="item.targetUrl"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95"
                  [ngClass]="getButtonClasses(item.severity)">
                  {{ item.actionLabel }}
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class DashboardActionCenterComponent {
  @Input() actions: SmartActionItem[] = [];
  filter: 'ALL' | 'CRITICAL' = 'ALL';

  get criticalCount(): number {
    return this.actions.filter(a => a.severity === 'CRITICAL').length;
  }

  get filteredActions(): SmartActionItem[] {
    if (this.filter === 'CRITICAL') {
      return this.actions.filter(a => a.severity === 'CRITICAL');
    }
    return this.actions;
  }

  getSeverityLabel(severity: SmartActionItem['severity']): string {
    switch (severity) {
      case 'CRITICAL': return 'Urgent';
      case 'WARNING': return 'Attention';
      case 'OPPORTUNITY': return 'Opportunité';
      default: return 'Information';
    }
  }

  getCardClasses(severity: SmartActionItem['severity']): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/30 hover:border-red-500/50';
      case 'WARNING':
        return 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 hover:border-amber-500/50';
      case 'OPPORTUNITY':
        return 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 hover:border-emerald-500/50';
      default:
        return 'bg-black/[.02] border-black/10 hover:border-black/20';
    }
  }

  getBadgeClasses(severity: SmartActionItem['severity']): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'OPPORTUNITY':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  }

  getMetricClasses(severity: SmartActionItem['severity']): string {
    switch (severity) {
      case 'CRITICAL': return 'text-red-400';
      case 'WARNING': return 'text-amber-400';
      case 'OPPORTUNITY': return 'text-emerald-400';
      default: return 'text-blue-400';
    }
  }

  getButtonClasses(severity: SmartActionItem['severity']): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20';
      case 'WARNING':
        return 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20';
      case 'OPPORTUNITY':
        return 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20';
      default:
        return 'bg-gold text-black hover:bg-gold/90 shadow-gold/20';
    }
  }
}
