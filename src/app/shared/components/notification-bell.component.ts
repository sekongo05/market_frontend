import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../core/services/notification.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { NotificationTemplateService } from '../../core/services/notification-template.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationResponse } from '../../core/models/notification.models';
import { NotificationType, UserRole } from '../../core/models/common.models';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="relative inline-flex">

      <!-- Bell button -->
      <button (click)="toggle($event)"
              class="relative flex items-center justify-center w-9 h-9 rounded-xl theme-muted hover:text-gold hover:bg-gold/8 transition-colors active:scale-[0.97]"
              aria-label="Notifications">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        @if (unreadCount > 0) {
          <span class="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        }
      </button>

      <!-- Dropdown panel -->
      @if (open) {
        <div class="absolute right-0 top-11 w-80 max-h-[70vh] flex flex-col
                    theme-surface border theme-border rounded-2xl shadow-2xl overflow-hidden z-[100]
                    animate-fade-in-up">

          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b theme-border flex-shrink-0">
            <span class="text-sm font-bold theme-text">Notifications</span>
            @if (unreadCount > 0) {
              <button (click)="markAllAsRead()"
                      class="text-xs text-gold font-semibold hover:opacity-70 transition-opacity active:scale-[0.97]">
                Tout lire
              </button>
            }
          </div>

          <!-- List -->
          <div class="overflow-y-auto flex-1">
            @if (loading) {
              <div class="flex justify-center py-8">
                <div class="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
              </div>
            } @else if (!notifications.length) {
              <div class="text-center py-8 px-4">
                <svg class="w-8 h-8 theme-muted mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <p class="text-sm theme-muted font-semibold">Aucune notification</p>
              </div>
            } @else {
              <div class="divide-y theme-border">
                @for (n of notifications; track n.id) {
                  <div (click)="markAsRead(n)"
                       class="flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gold/4 active:scale-[0.99]"
                       [class.opacity-50]="n.read">

                    <!-- Icon -->
                    <div class="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
                         [ngClass]="tpl(n).bgClass">
                      <svg class="w-4 h-4" [ngClass]="tpl(n).colorClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="tpl(n).iconPath"/>
                      </svg>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-0.5">
                        <span class="text-xs font-bold theme-text truncate">{{ tpl(n).label }}</span>
                        @if (!n.read) {
                          <span class="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0"></span>
                        }
                      </div>
                      <p class="text-xs theme-muted line-clamp-2 leading-snug">{{ n.subject }}</p>
                      <p class="text-[10px] theme-muted opacity-60 mt-1">{{ n.createdAt | date:'d MMM, HH:mm' }}</p>
                    </div>

                  </div>
                }
              </div>
            }
          </div>

        </div>
      }

    </div>
  `,
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  open = false;
  unreadCount = 0;
  notifications: NotificationResponse[] = [];
  loading = false;

  private loaded = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private wsService: WebSocketService,
    private templateService: NotificationTemplateService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUnreadCount();

    this.wsService.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.unreadCount++;
        if (this.open && this.loaded) {
          this.loadNotifications();
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('app-notification-bell')) {
      this.open = false;
      this.cdr.markForCheck();
    }
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open && !this.loaded) {
      this.loadNotifications();
    }
    this.cdr.markForCheck();
  }

  markAsRead(n: NotificationResponse): void {
    if (!n.read) {
      n.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notificationService.markAsRead(n.id).subscribe();
    }
    const link = this.getLink(n.type);
    if (link) {
      this.open = false;
      this.router.navigateByUrl(link);
    }
    this.cdr.markForCheck();
  }

  getLink(type: NotificationType): string | null {
    const role      = this.authService.getCurrentUser()?.role;
    const isAdmin   = role === UserRole.ADMIN;
    const isManager = role === UserRole.MANAGER;
    const isStaff   = isAdmin || isManager;

    switch (type) {

      // Commandes — même type envoyé au client ET au staff
      case NotificationType.ORDER_CREATED:
      case NotificationType.ORDER_CANCELLED:
        if (isAdmin)   return '/admin/orders';
        if (isManager) return '/manager/orders';
        return '/orders';

      // Commandes — client uniquement
      case NotificationType.ORDER_CONFIRMED:
      case NotificationType.ORDER_STATUS_CHANGED:
      case NotificationType.CARRIER_ASSIGNED:
      case NotificationType.DELIVERY_UPDATE:
      case NotificationType.REVIEW_REQUEST:
        return '/orders';

      // Retours — même type envoyé au client ET au staff
      case NotificationType.RETURN_REQUESTED:
        return isStaff ? '/admin/returns' : '/returns';

      // Retours — client uniquement
      case NotificationType.RETURN_DECIDED:
      case NotificationType.RETURN_COMPLETED:
        return '/returns';

      // Bienvenue — client uniquement
      case NotificationType.WELCOME:
        return '/products';

      // Avis — admin uniquement
      case NotificationType.REVIEW_RECEIVED:
        return isAdmin ? '/admin/reviews' : null;

      // Stock — staff uniquement
      case NotificationType.STOCK_LOW:
      case NotificationType.STOCK_ALERT:
        if (isAdmin)   return '/admin/products';
        if (isManager) return '/manager/products';
        return null;

      default:
        return null;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => (n.read = true));
    this.unreadCount = 0;
    this.cdr.markForCheck();
    this.notificationService.markAllAsRead().subscribe();
  }

  tpl(n: NotificationResponse) {
    return this.templateService.get(n.type);
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => {
        this.unreadCount = res.data?.count ?? 0;
        this.cdr.markForCheck();
      },
    });
  }

  private loadNotifications(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.notificationService.getNotifications({ size: 20 }).subscribe({
      next: (res) => {
        this.notifications = res.data?.content ?? [];
        this.loaded = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
