import { Injectable, signal } from '@angular/core';

export interface AdminToast { id: number; msg: string; type: 'success' | 'error'; }

@Injectable({ providedIn: 'root' })
export class AdminToastService {
  private _id = 0;
  readonly toasts = signal<AdminToast[]>([]);

  show(msg: string, type: 'success' | 'error' = 'success'): void {
    const id = ++this._id;
    this.toasts.update(t => [...t, { id, msg, type }]);
    setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 3500);
  }
}
