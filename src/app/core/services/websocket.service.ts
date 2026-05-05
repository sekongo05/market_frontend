import { Injectable, OnDestroy } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WsNotification, WsStockUpdate, WsOrderEvent } from '../models/notification.models';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client: Client | null = null;

  private notificationSubject = new Subject<WsNotification>();
  private stockSubject        = new Subject<WsStockUpdate>();
  private orderEventSubject   = new Subject<WsOrderEvent>();

  readonly notification$ = this.notificationSubject.asObservable();
  readonly stockUpdate$  = this.stockSubject.asObservable();
  readonly orderEvent$   = this.orderEventSubject.asObservable();

  connect(token: string, isStaff: boolean): void {
    if (this.client?.active) return;

    this.client = new Client({
      brokerURL: environment.wsUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        // Notifications personnelles
        this.client!.subscribe('/user/queue/notifications', (msg) => {
          try { this.notificationSubject.next(JSON.parse(msg.body)); } catch { /* ignore */ }
        });

        // Mises à jour de stock (toutes les sessions, même non connectées, sont OK)
        this.client!.subscribe('/topic/stock', (msg) => {
          try { this.stockSubject.next(JSON.parse(msg.body)); } catch { /* ignore */ }
        });

        if (isStaff) {
          // Notifications staff
          this.client!.subscribe('/topic/staff/notifications', (msg) => {
            try { this.notificationSubject.next(JSON.parse(msg.body)); } catch { /* ignore */ }
          });
          // Événements commandes (nouveau + changement de statut)
          this.client!.subscribe('/topic/staff/orders', (msg) => {
            try { this.orderEventSubject.next(JSON.parse(msg.body)); } catch { /* ignore */ }
          });
        }
      },
      onStompError: (frame) => {
        console.warn('WebSocket STOMP error', frame.headers['message']);
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
