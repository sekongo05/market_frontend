import { NotificationType } from './common.models';

export interface NotificationResponse {
  id: number;
  type: NotificationType;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface GetNotificationsParams {
  page?: number;
  size?: number;
}
