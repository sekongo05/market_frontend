import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { ProductResponse, GetProductsParams } from '../../../core/models/product.models';
import { PageResponse } from '../../../core/models/common.models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
})
export class ProductsComponent implements OnInit {
  products: ProductResponse[] = [];
  loading = false;
  error: string | null = null;
  currentPage = 0;
  pageSize = 12;
  totalPages = 0;
  searchQuery = '';

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(page: number = 0): void {
    this.loading = true;
    this.error = null;

    const params: GetProductsParams = {
      page,
      size: this.pageSize,
    };

    if (this.searchQuery) {
      params.search = this.searchQuery;
    }

    this.productService.getProducts(params).subscribe({
      next: (response) => {
        if (response.success) {
          const pageResponse = response.data as PageResponse<ProductResponse>;
          this.products = pageResponse.content;
          this.currentPage = page;
          this.totalPages = pageResponse.totalPages;
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement des produits';
        this.loading = false;
        console.error(error);
      },
    });
  }

  search(): void {
    this.loadProducts(0);
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.loadProducts(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.loadProducts(this.currentPage + 1);
    }
  }

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 0; i < this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }
}
