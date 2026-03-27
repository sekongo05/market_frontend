import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { OrderResponse } from '../../../core/models/order.models';
import { PageResponse } from '../../../core/models/common.models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
})
export class OrdersComponent implements OnInit {
  orders: OrderResponse[] = [];
  loading = false;
  error: string | null = null;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(page: number = 0): void {
    this.loading = true;
    this.error = null;

    this.orderService.getMyOrders(page, this.pageSize).subscribe({
      next: (response) => {
        if (response.success) {
          const pageResponse = response.data as PageResponse<OrderResponse>;
          this.orders = pageResponse.content;
          this.currentPage = page;
          this.totalPages = pageResponse.totalPages;
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement des commandes';
        this.loading = false;
        console.error(error);
      },
    });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.loadOrders(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.loadOrders(this.currentPage + 1);
    }
  }
}
