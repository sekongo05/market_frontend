import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/common.models';
import {
  NotificationResponse,
  UnreadCountResponse,
  GetNotificationsParams,
} from '../models/notification.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private apiService: ApiService) {}

  getNotifications(params?: GetNotificationsParams): Observable<
    ApiResponse<PageResponse<NotificationResponse>>
  > {
    return this.apiService.get('/notifications', params);
  }

  getUnreadCount(): Observable<ApiResponse<UnreadCountResponse>> {
    return this.apiService.get('/notifications/unread-count');
  }

  markAsRead(id: number): Observable<ApiResponse<null>> {
    return this.apiService.patch(`/notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<ApiResponse<null>> {
    return this.apiService.patch('/notifications/read-all', {});
  }
}
