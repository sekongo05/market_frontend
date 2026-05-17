import { Injectable, signal } from '@angular/core';

export interface ManagerToast { id: number; msg: string; type: 'success' | 'error'; }

@Injectable({ providedIn: 'root' })
export class ManagerToastService {
  private _id = 0;
  readonly toasts = signal<ManagerToast[]>([]);

  show(msg: string, type: 'success' | 'error' = 'success'): void {
    const id = ++this._id;
    this.toasts.update(t => [...t, { id, msg, type }]);
    setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 3500);
  }
}
