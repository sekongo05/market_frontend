import { Injectable, OnDestroy } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WsNotification, WsStockUpdate, WsOrderEvent, WsOrderStatusUpdate, WsStaffEvent } from '../models/notification.models';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client: Client | null = null;

  private notificationSubject      = new Subject<WsNotification>();
  private stockSubject             = new Subject<WsStockUpdate>();
  private orderEventSubject        = new Subject<WsOrderEvent>();
  private orderStatusUpdateSubject = new Subject<WsOrderStatusUpdate>();
  private staffEventSubject        = new Subject<WsStaffEvent>();

  readonly notification$      = this.notificationSubject.asObservable();
  readonly stockUpdate$       = this.stockSubject.asObservable();
  readonly orderEvent$        = this.orderEventSubject.asObservable();
  readonly orderStatusUpdate$ = this.orderStatusUpdateSubject.asObservable();
  readonly staffEvent$        = this.staffEventSubject.asObservable();

  /**
   * (Re)connecte au broker WebSocket.
   * - token=null  → mode anonyme : topics publics uniquement (/topic/stock)
   * - token fourni → mode authentifié : topics publics + privés (notifications, statut commande)
   * - isStaff=true → abonnements supplémentaires staff en plus
   */
  connect(token: string | null = null, isStaff = false): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    this.client = new Client({
      brokerURL: environment.wsUrl,
      connectHeaders: headers,
      reconnectDelay: 5000,
      onConnect: () => {
        // ── Public : stock visible par tous (connecté ou non) ──────────────
        this.client!.subscribe('/topic/stock', (msg) => {
          try { this.stockSubject.next(JSON.parse(msg.body)); } catch { /* ignore */ }
        });

        if (token) {
          // ── Authentifié : notifications personnelles ──────────────────────
          this.client!.subscribe('/user/queue/notifications', (msg) => {
            try { this.notificationSubject.next(JSON.parse(msg.body)); } catch { /* ignore */ }
          });

          // ── Authentifié : mise à jour statut commande en direct ───────────
          this.client!.subscribe('/user/queue/order-status', (msg) => {
            try { this.orderStatusUpdateSubject.next(JSON.parse(msg.body)); } catch { /* ignore */ }
          });
        }

        if (isStaff) {
          // ── Staff : notifications de gestion ─────────────────────────────
          this.client!.subscribe('/topic/staff/notifications', (msg) => {
            try { this.notificationSubject.next(JSON.parse(msg.body)); } catch { /* ignore */ }
          });

          // ── Staff : nouvelles commandes + compteur PENDING ────────────────
          this.client!.subscribe('/topic/staff/orders', (msg) => {
            try { this.orderEventSubject.next(JSON.parse(msg.body)); } catch { /* ignore */ }
          });

          // ── Staff : événements métier (produits, catégories, promos…) ─────
          this.client!.subscribe('/topic/staff/events', (msg) => {
            try { this.staffEventSubject.next(JSON.parse(msg.body)); } catch { /* ignore */ }
          });
        }
      },
      onStompError: (frame) => {
        console.warn('WebSocket error', frame.headers['message']);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
