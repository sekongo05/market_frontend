import { Injectable, OnDestroy } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WsNotification } from '../models/notification.models';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client: Client | null = null;
  private notificationSubject = new Subject<WsNotification>();

  readonly notification$ = this.notificationSubject.asObservable();

  connect(token: string, isStaff: boolean): void {
    if (this.client?.active) return;

    this.client = new Client({
      brokerURL: environment.wsUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        this.client!.subscribe('/user/queue/notifications', (msg) => {
          try {
            this.notificationSubject.next(JSON.parse(msg.body) as WsNotification);
          } catch { /* ignore malformed frames */ }
        });

        if (isStaff) {
          this.client!.subscribe('/topic/staff/notifications', (msg) => {
            try {
              this.notificationSubject.next(JSON.parse(msg.body) as WsNotification);
            } catch { /* ignore malformed frames */ }
          });
        }
      },
      onDisconnect: () => { /* reconnect is handled automatically by the client */ },
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
