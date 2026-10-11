import { Injectable, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, StompSubscription } from '@stomp/stompjs';
import { Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WsNotification, WsStockUpdate, WsOrderEvent, WsOrderStatusUpdate, WsStaffEvent } from '../models/notification.models';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client: Client | null = null;
  private isBrowser: boolean;

  private connectedSubject         = new BehaviorSubject<boolean>(false);
  private notificationSubject      = new Subject<WsNotification>();
  private stockSubject             = new Subject<WsStockUpdate>();
  private subs: StompSubscription[] = [];
  private orderEventSubject        = new Subject<WsOrderEvent>();
  private orderStatusUpdateSubject = new Subject<WsOrderStatusUpdate>();
  private staffEventSubject        = new Subject<WsStaffEvent>();

  readonly connected$         = this.connectedSubject.asObservable();
  readonly notification$      = this.notificationSubject.asObservable();
  readonly stockUpdate$       = this.stockSubject.asObservable();
  readonly orderEvent$        = this.orderEventSubject.asObservable();
  readonly orderStatusUpdate$ = this.orderStatusUpdateSubject.asObservable();
  readonly staffEvent$        = this.staffEventSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * (Re)connecte au broker WebSocket.
   * - token=null  → mode anonyme : topics publics uniquement (/topic/stock)
   * - token fourni → mode authentifié : topics publics + privés (notifications, statut commande)
   * - isStaff=true → abonnements supplémentaires staff en plus
   */
  connect(token: string | null = null, isStaff = false): void {
    if (!this.isBrowser) return;

    if (this.client) {
      try { this.client.deactivate(); } catch (_) {}
      this.client = null;
    }

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    this.client = new Client({
      brokerURL: environment.wsUrl,
      connectHeaders: headers,
      reconnectDelay: 4000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      debug: (msg: string) => {
        // En cas de debug nécessaire, décommenter : console.debug('[STOMP]', msg);
      },
      onConnect: () => {
        this.connectedSubject.next(true);

        // Nettoyer les anciens abonnements pour éviter les doublons après reconnexion
        this.subs.forEach(s => {
          try { s.unsubscribe(); } catch (_) {}
        });
        this.subs = [];

        // ── Public : stock ──────────────────────────────────────────────
        this.subs.push(
          this.client!.subscribe('/topic/stock', (msg) => {
            try { this.stockSubject.next(JSON.parse(msg.body)); }
            catch (e) { console.error('WebSocket: stock parse error', e); }
          })
        );

        if (token) {
          this.subs.push(
            this.client!.subscribe('/user/queue/notifications', (msg) => {
              try { this.notificationSubject.next(JSON.parse(msg.body)); }
              catch (e) { console.error('WebSocket: notification parse error', e); }
            })
          );

          this.subs.push(
            this.client!.subscribe('/user/queue/order-status', (msg) => {
              try { this.orderStatusUpdateSubject.next(JSON.parse(msg.body)); }
              catch (e) { console.error('WebSocket: order-status parse error', e); }
            })
          );
        }

        if (isStaff) {
          this.subs.push(
            this.client!.subscribe('/topic/staff/notifications', (msg) => {
              try { this.notificationSubject.next(JSON.parse(msg.body)); }
              catch (e) { console.error('WebSocket: staff-notification parse error', e); }
            })
          );

          this.subs.push(
            this.client!.subscribe('/topic/staff/orders', (msg) => {
              try { this.orderEventSubject.next(JSON.parse(msg.body)); }
              catch (e) { console.error('WebSocket: order parse error', e); }
            })
          );

          this.subs.push(
            this.client!.subscribe('/topic/staff/events', (msg) => {
              try { this.staffEventSubject.next(JSON.parse(msg.body)); }
              catch (e) { console.error('WebSocket: staff-event parse error', e); }
            })
          );
        }
      },
      beforeConnect: () => {
        // Token frais à chaque tentative
        if (typeof localStorage !== 'undefined' && this.client) {
          const freshToken = localStorage.getItem('auth_token');
          if (freshToken) {
            this.client.connectHeaders['Authorization'] = `Bearer ${freshToken}`;
          }
        }
      },
      onWebSocketClose: () => {
        this.connectedSubject.next(false);
      },
      onDisconnect: () => {
        this.connectedSubject.next(false);
      },
      onStompError: (frame) => {
        this.connectedSubject.next(false);
        console.warn('STOMP error:', frame?.headers?.['message'] || 'Connexion interrompue');
      },
    });

    try {
      this.client.activate();
    } catch (e) {
      console.warn('Erreur activation WebSocket:', e);
    }
  }

  disconnect(): void {
    this.connectedSubject.next(false);
    this.subs.forEach(s => {
      try { s.unsubscribe(); } catch (_) {}
    });
    this.subs = [];
    try {
      this.client?.deactivate();
    } catch (_) {}
    this.client = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
