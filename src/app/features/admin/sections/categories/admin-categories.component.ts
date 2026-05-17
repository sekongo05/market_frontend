import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CategoryService } from '../../../../core/services/category.service';
import { CategoryResponse } from '../../../../core/models/category.models';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { TooltipDirective } from '../../../../shared/directives/tooltip.directive';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TooltipDirective],
  templateUrl: './admin-categories.component.html',
})
export class AdminCategoriesComponent implements OnInit, OnDestroy {
  categories: CategoryResponse[] = [];
  categoriesLoading = false;
  categoryToggleId: number | null = null;
  showCategoryForm = false;
  editingCategory: CategoryResponse | null = null;
  categoryForm = { name: '', description: '', imageUrl: '' };
  categoryFormLoading = false;
  categoryFormError: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private categoryService: CategoryService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private scrollLock: ScrollLockService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e.module === 'categories') this.loadCategories();
    });
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get activeCategories():   number { return this.categories.filter(c => c.active).length; }
  get inactiveCategories(): number { return this.categories.filter(c => !c.active).length; }

  loadCategories(): void {
    this.categoriesLoading = true;
    this.categoryService.getAllForAdmin().subscribe({
      next: (r) => { if (r.success) this.categories = r.data; this.categoriesLoading = false; this.cdr.markForCheck(); },
      error: () => { this.categoriesLoading = false; this.cdr.markForCheck(); },
    });
  }

  openCategoryForm(): void {
    this.editingCategory = null;
    this.categoryForm = { name: '', description: '', imageUrl: '' };
    this.categoryFormError = null;
    this.showCategoryForm = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
  }

  openEditCategoryForm(cat: CategoryResponse): void {
    this.editingCategory = cat;
    this.categoryForm = { name: cat.name, description: cat.description ?? '', imageUrl: cat.imageUrl ?? '' };
    this.categoryFormError = null;
    this.showCategoryForm = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
  }

  closeCategoryForm(): void {
    this.showCategoryForm = false;
    this.editingCategory = null;
    this.categoryFormError = null;
    this.scrollLock.unlock();
    this.cdr.markForCheck();
  }

  submitCategory(): void {
    if (!this.categoryForm.name.trim()) { this.categoryFormError = 'Le nom est obligatoire'; return; }
    this.categoryFormLoading = true;
    this.categoryFormError = null;
    const payload = {
      name: this.categoryForm.name.trim(),
      description: this.categoryForm.description.trim() || undefined,
      imageUrl: this.categoryForm.imageUrl.trim() || undefined,
    };
    const req$ = this.editingCategory
      ? this.categoryService.updateCategory(this.editingCategory.id, payload)
      : this.categoryService.createCategory(payload);
    req$.subscribe({
      next: (r) => {
        if (r.success) {
          if (this.editingCategory) {
            const idx = this.categories.findIndex(c => c.id === this.editingCategory!.id);
            if (idx !== -1) { this.categories = [...this.categories]; this.categories[idx] = r.data; }
          } else {
            this.categories = [...this.categories, r.data];
          }
          this.showCategoryForm = false;
          this.editingCategory = null;
          this.scrollLock.unlock();
          this.toast.show(this.editingCategory ? 'Catégorie mise à jour ✓' : 'Catégorie créée ✓');
        }
        this.categoryFormLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.categoryFormError = err?.error?.message || 'Erreur lors de la sauvegarde';
        this.categoryFormLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleCategory(cat: CategoryResponse): void {
    this.categoryToggleId = cat.id;
    this.categoryService.toggleCategoryActive(cat.id).subscribe({
      next: (r) => {
        if (r.success) {
          const idx = this.categories.findIndex(c => c.id === cat.id);
          if (idx !== -1) { this.categories = [...this.categories]; this.categories[idx] = r.data; }
        }
        this.categoryToggleId = null;
        this.cdr.markForCheck();
      },
      error: () => { this.categoryToggleId = null; this.cdr.markForCheck(); },
    });
  }
}
