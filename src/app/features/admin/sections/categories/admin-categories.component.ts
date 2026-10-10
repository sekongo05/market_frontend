import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CategoryService } from '../../../../core/services/category.service';
import { CategoryResponse, CategoryAttributeDef, CategoryAttributeValueDef } from '../../../../core/models/category.models';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { TooltipDirective } from '../../../../shared/directives/tooltip.directive';
import { UploadService } from '../../../../core/services/upload.service';
import { compressImage } from '../../../../core/utils/image-compression.util';

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
  categoryDefaultAttributes: CategoryAttributeDef[] = [];
  editingAttrIndex: number | null = null;
  newAttrDefName = '';
  newAttrDefValues = '';
  categoryFormLoading = false;
  categoryFormError: string | null = null;
  imageUploading = false;
  imagePreview: string | null = null;
  imageDragOver = false;

  // Confirmation dialog before deactivating
  pendingToggleCat: CategoryResponse | null = null;
  confirmToggleCat = false;

  private readonly COLOR_MAP: Record<string, string> = {
    // Couleurs basiques
    'noir': '#000000', 'black': '#000000',
    'blanc': '#FFFFFF', 'white': '#FFFFFF',
    'rouge': '#FF0000', 'red': '#FF0000',
    'bleu': '#0000FF', 'blue': '#0000FF',
    'vert': '#008000', 'green': '#008000',
    'jaune': '#FFD700', 'yellow': '#FFD700',
    'orange': '#FF8C00',
    'rose': '#FF69B4', 'pink': '#FF69B4',
    'violet': '#800080', 'purple': '#800080',
    'gris': '#808080', 'grey': '#808080', 'gray': '#808080',
    'marron': '#8B4513', 'brun': '#5C4033', 'brown': '#8B4513',
    'beige': '#F5F5DC',
    // Bijouterie, métaux & horlogerie
    'or': '#FFD700', 'gold': '#FFD700', 'dore': '#FFD700', 'doré': '#FFD700',
    'or rose': '#B76E79', 'rose gold': '#B76E79',
    'or jaune': '#FFD700',
    'or blanc': '#F4F4F4',
    'argent': '#C0C0C0', 'silver': '#C0C0C0', 'argente': '#C0C0C0', 'argenté': '#C0C0C0',
    'acier': '#B0C4DE', 'acier inoxydable': '#B0C4DE',
    'platine': '#E5E4E2',
    'bronze': '#CD7F32',
    'cuivre': '#B87333',
    // Nuances de mode
    'bleu marine': '#001F3F', 'marine': '#001F3F', 'navy': '#001F3F',
    'bleu ciel': '#87CEEB',
    'bleu nuit': '#191970',
    'bleu roi': '#4169E1',
    'bordeaux': '#800020', 'burgundy': '#800020',
    'kaki': '#556B2F', 'khaki': '#556B2F',
    'turquoise': '#40E0D0',
    'vert olive': '#808000', 'olive': '#808000',
    'vert emeraude': '#50C878', 'emeraude': '#50C878', 'vert émeraude': '#50C878', 'émeraude': '#50C878',
    'anthracite': '#303030',
    'taupe': '#483C32',
    'cognac': '#9A463D',
    'caramel': '#C68E17',
    'moutarde': '#E1AD01',
    'corail': '#FF7F50', 'coral': '#FF7F50',
    'lilas': '#C8A2C8',
    'lavande': '#E6E6FA',
    'fuchsia': '#FF00FF',
    'creme': '#FFFDD0', 'crème': '#FFFDD0', 'ivoire': '#FFFFF0', 'ivory': '#FFFFF0',
    'menthe': '#98FF98',
  };

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
    this.categoryDefaultAttributes = [];
    this.editingAttrIndex = null;
    this.newAttrDefName = '';
    this.newAttrDefValues = '';
    this.categoryFormError = null;
    this.imagePreview = null;
    this.showCategoryForm = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
  }

  openEditCategoryForm(cat: CategoryResponse): void {
    this.editingCategory = cat;
    this.categoryDefaultAttributes = [];
    this.editingAttrIndex = null;
    this.newAttrDefName = '';
    this.newAttrDefValues = '';
    if (cat.defaultAttributes) {
      try {
        const raw = JSON.parse(cat.defaultAttributes);
        if (Array.isArray(raw)) {
          this.categoryDefaultAttributes = raw.map((a: any) => ({
            name: a.name || '',
            values: (a.values || []).map((v: any) => typeof v === 'string' ? { name: v } : { name: v.name || '', hex: v.hex }),
          }));
        }
      } catch (e) {
        this.categoryDefaultAttributes = [];
      }
    }
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
    this.editingAttrIndex = null;
    this.newAttrDefName = '';
    this.newAttrDefValues = '';
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

  private async uploadCategoryImage(file: File): Promise<void> {
    this.imageUploading = true;
    this.cdr.markForCheck();
    let fileToUpload = file;
    try {
      const { file: compressed } = await compressImage(file);
      fileToUpload = compressed;
    } catch {
      fileToUpload = file;
    }
    this.uploadService.uploadCategoryImage(fileToUpload).subscribe({
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

  
  startEditDefaultAttribute(index: number): void {
    this.editingAttrIndex = index;
    const attr = this.categoryDefaultAttributes[index];
    if (!attr) return;
    this.newAttrDefName = attr.name;
    this.newAttrDefValues = attr.values
      .map(v => v.hex ? `${v.name}:${v.hex}` : v.name)
      .join(', ');
    this.cdr.markForCheck();
  }

  cancelEditDefaultAttribute(): void {
    this.editingAttrIndex = null;
    this.newAttrDefName = '';
    this.newAttrDefValues = '';
    this.cdr.markForCheck();
  }

  saveDefaultAttribute(): void {
    if (!this.newAttrDefName.trim() || !this.newAttrDefValues.trim()) return;

    const existingValues = this.editingAttrIndex !== null
      ? this.categoryDefaultAttributes[this.editingAttrIndex]?.values
      : undefined;

    const vals = this.parseAttrValues(this.newAttrDefValues, existingValues);
    if (vals.length === 0) return;

    if (this.editingAttrIndex !== null) {
      this.categoryDefaultAttributes[this.editingAttrIndex] = {
        name: this.newAttrDefName.trim(),
        values: vals,
      };
      this.editingAttrIndex = null;
    } else {
      this.categoryDefaultAttributes.push({
        name: this.newAttrDefName.trim(),
        values: vals,
      });
    }

    this.newAttrDefName = '';
    this.newAttrDefValues = '';
    this.cdr.markForCheck();
  }

  addDefaultAttribute(): void {
    this.saveDefaultAttribute();
  }

  removeDefaultAttribute(index: number): void {
    if (this.editingAttrIndex === index) {
      this.cancelEditDefaultAttribute();
    } else if (this.editingAttrIndex !== null && this.editingAttrIndex > index) {
      this.editingAttrIndex--;
    }
    this.categoryDefaultAttributes.splice(index, 1);
    this.cdr.markForCheck();
  }

  updateValueColor(attrIndex: number, valIndex: number, newHex: string): void {
    const attr = this.categoryDefaultAttributes[attrIndex];
    if (attr && attr.values[valIndex]) {
      attr.values[valIndex].hex = newHex.toUpperCase();
      this.cdr.markForCheck();
    }
  }

  private parseAttrValues(input: string, existingValues?: CategoryAttributeValueDef[]): CategoryAttributeValueDef[] {
    return input
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .map(item => {
        const hexColon = item.match(/^(.+?)\s*:\s*(#[0-9A-Fa-f]{6})$/i);
        if (hexColon) {
          return { name: hexColon[1].trim(), hex: hexColon[2].toUpperCase() };
        }
        const hexParen = item.match(/^(.+?)\s*\(\s*(#[0-9A-Fa-f]{6})\s*\)$/i);
        if (hexParen) {
          return { name: hexParen[1].trim(), hex: hexParen[2].toUpperCase() };
        }
        if (existingValues) {
          const match = existingValues.find(ev => ev.name.toLowerCase() === item.toLowerCase());
          if (match?.hex) {
            return { name: item, hex: match.hex };
          }
        }
        // Reconnaissance automatique par nom usuel (ex: "Noir", "Or Rose", "Bleu Marine", etc.)
        const lower = item.toLowerCase();
        const normalized = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const autoHex = this.COLOR_MAP[lower] || this.COLOR_MAP[normalized];
        if (autoHex) {
          return { name: item, hex: autoHex };
        }
        return { name: item };
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
      defaultAttributes: this.categoryDefaultAttributes.length > 0 ? JSON.stringify(this.categoryDefaultAttributes) : undefined,
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
