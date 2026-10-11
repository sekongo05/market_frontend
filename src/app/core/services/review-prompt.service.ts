import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ReviewPromptProduct {
  id?: number;
  slug: string;
  name: string;
  imageUrl?: string | null;
}

export interface ReviewPromptData {
  orderNumber?: string;
  subject?: string;
  products: ReviewPromptProduct[];
}

@Injectable({
  providedIn: 'root'
})
export class ReviewPromptService {
  private promptSubject = new BehaviorSubject<ReviewPromptData | null>(null);
  readonly prompt$ = this.promptSubject.asObservable();

  openPrompt(data: ReviewPromptData): void {
    if (!data.products || data.products.length === 0) return;
    this.promptSubject.next(data);
  }

  closePrompt(): void {
    this.promptSubject.next(null);
  }
}
