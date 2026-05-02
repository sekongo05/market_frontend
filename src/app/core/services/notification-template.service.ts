import { Injectable } from '@angular/core';
import { NotificationType } from '../models/common.models';

export interface NotifTemplate {
  label: string;
  iconPath: string;
  iconViewBox: string;
  colorClass: string;       // text color
  bgClass: string;          // icon badge bg
  borderClass: string;      // detail banner border
  bannerClass: string;      // detail banner bg
}

@Injectable({ providedIn: 'root' })
export class NotificationTemplateService {

  private templates: Record<NotificationType, NotifTemplate> = {
    [NotificationType.ORDER_CREATED]: {
      label: 'Nouvelle commande',
      iconPath: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
      iconViewBox: '0 0 24 24',
      colorClass: 'text-blue-400',
      bgClass: 'bg-blue-500/15',
      borderClass: 'border-blue-500/30',
      bannerClass: 'bg-blue-500/8',
    },
    [NotificationType.ORDER_CONFIRMED]: {
      label: 'Commande confirmée',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      iconViewBox: '0 0 24 24',
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/15',
      borderClass: 'border-emerald-500/30',
      bannerClass: 'bg-emerald-500/8',
    },
    [NotificationType.ORDER_CANCELLED]: {
      label: 'Commande annulée',
      iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      iconViewBox: '0 0 24 24',
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/15',
      borderClass: 'border-red-500/30',
      bannerClass: 'bg-red-500/8',
    },
    [NotificationType.ORDER_STATUS_CHANGED]: {
      label: 'Statut de commande',
      iconPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      iconViewBox: '0 0 24 24',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/15',
      borderClass: 'border-amber-500/30',
      bannerClass: 'bg-amber-500/8',
    },
    [NotificationType.DELIVERY_UPDATE]: {
      label: 'Mise à jour livraison',
      iconPath: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
      iconViewBox: '0 0 24 24',
      colorClass: 'text-violet-400',
      bgClass: 'bg-violet-500/15',
      borderClass: 'border-violet-500/30',
      bannerClass: 'bg-violet-500/8',
    },
  };

  get(type: NotificationType): NotifTemplate {
    return this.templates[type] ?? this.fallback();
  }

  private fallback(): NotifTemplate {
    return {
      label: 'Notification',
      iconPath: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      iconViewBox: '0 0 24 24',
      colorClass: 'text-gray-400',
      bgClass: 'bg-gray-500/15',
      borderClass: 'border-gray-500/30',
      bannerClass: 'bg-gray-500/8',
    };
  }
}
