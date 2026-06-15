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
import { UploadService } from '../../../../core/services/upload.service';

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
  categoryForm = { name: '', description: '', imageUrl: '', displayOrder: 0 };
  categoryFormLoading = false;
  categoryFormError: string | null = null;
  imageUploading = false;
  imagePreview: string | null = null;
  imageDragOver = false;

  // Confirmation dialog before deactivating
  pendingToggleCat: CategoryResponse | null = null;
  confirmToggleCat = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private categoryService: CategoryService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private scrollLock: ScrollLockService,
    private uploadService: UploadService,
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
    this.categoryForm = { name: '', description: '', imageUrl: '', displayOrder: 0 };
    this.categoryFormError = null;
    this.imagePreview = null;
    this.showCategoryForm = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
  }

  openEditCategoryForm(cat: CategoryResponse): void {
    this.editingCategory = cat;
    this.categoryForm = {
      name: cat.name,
      description: cat.description ?? '',
      imageUrl: cat.imageUrl ?? '',
      displayOrder: cat.displayOrder ?? 0,
    };
    this.categoryFormError = null;
    this.imagePreview = cat.imageUrl || null;
    this.showCategoryForm = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
  }

  closeCategoryForm(): void {
    this.showCategoryForm = false;
    this.editingCategory = null;
    this.categoryFormError = null;
    this.imagePreview = null;
    this.scrollLock.unlock();
    this.cdr.markForCheck();
  }



  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.uploadCategoryImage(input.files[0]);
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    this.imageDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) this.uploadCategoryImage(file);
    this.cdr.markForCheck();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.imageDragOver = true;
    this.cdr.markForCheck();
  }

  onDragLeave(): void {
    this.imageDragOver = false;
    this.cdr.markForCheck();
  }

  removeImage(): void {
    this.categoryForm.imageUrl = '';
    this.imagePreview = null;
    this.cdr.markForCheck();
  }

  private uploadCategoryImage(file: File): void {
    this.imageUploading = true;
    this.cdr.markForCheck();
    this.uploadService.uploadCategoryImage(file).subscribe({
      next: (url) => {
        this.categoryForm.imageUrl = url;
        this.imagePreview = url;
        this.imageUploading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.categoryFormError = err?.error?.message || "Erreur lors de l'upload de l'image";
        this.imageUploading = false;
        this.cdr.markForCheck();
      },
    });
  }

  submitCategory(): void {
    if (!this.categoryForm.name.trim()) { this.categoryFormError = 'Le nom est obligatoire'; return; }
    this.categoryFormLoading = true;
    this.categoryFormError = null;
    // Capture isEditing before any null assignment
    const isEditing = !!this.editingCategory;
    const editingId  = this.editingCategory?.id;
    const payload: any = {
      name: this.categoryForm.name.trim(),
      description: this.categoryForm.description.trim() || undefined,
      imageUrl: this.categoryForm.imageUrl.trim() || undefined,
      displayOrder: this.categoryForm.displayOrder,
    };
    const req$ = isEditing
      ? this.categoryService.updateCategory(editingId!, payload)
      : this.categoryService.createCategory(payload);
    req$.subscribe({
      next: (r) => {
        if (r.success) {
          if (isEditing) {
            const idx = this.categories.findIndex(c => c.id === editingId);
            if (idx !== -1) { this.categories = [...this.categories]; this.categories[idx] = r.data; }
          } else {
            this.categories = [...this.categories, r.data];
          }
          this.showCategoryForm = false;
          this.editingCategory = null;
          this.scrollLock.unlock();
          this.toast.show(isEditing ? 'Catégorie mise à jour ✓' : 'Catégorie créée ✓');
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

  requestToggleCategory(cat: CategoryResponse): void {
    if (cat.active) {
      // Ask for confirmation before deactivating
      this.pendingToggleCat = cat;
      this.confirmToggleCat = true;
      this.cdr.markForCheck();
    } else {
      this.executeToggle(cat);
    }
  }

  confirmDeactivate(): void {
    if (this.pendingToggleCat) {
      this.executeToggle(this.pendingToggleCat);
    }
    this.pendingToggleCat = null;
    this.confirmToggleCat = false;
    this.cdr.markForCheck();
  }

  cancelDeactivate(): void {
    this.pendingToggleCat = null;
    this.confirmToggleCat = false;
    this.cdr.markForCheck();
  }

  private executeToggle(cat: CategoryResponse): void {
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
