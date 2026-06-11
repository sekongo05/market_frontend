import {
  Component, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { SupplierService } from '../../../../core/services/supplier.service';
import { ProductService } from '../../../../core/services/product.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import {
  PurchaseOrderResponse,
  PurchaseOrderItemResponse,
  PurchaseOrderRequest,
  PurchaseOrderItemRequest,
  GoodsReceiptRequest,
  GoodsReceiptItemRequest,
  PurchaseOrderStatus,
} from '../../../../core/models/purchase-order.models';
import { SupplierResponse } from '../../../../core/models/supplier.models';
import { ProductResponse } from '../../../../core/models/product.models';

type DrawerMode = 'create' | 'detail' | 'receive' | null;

interface DraftItem extends PurchaseOrderItemRequest {
  productName: string;
  unitCostPreview: number;
}

interface ReceiveLine {
  item: PurchaseOrderItemResponse;
  qty: number;
}

@Component({
  selector: 'app-admin-purchase-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-purchase-orders.component.html',
})
export class AdminPurchaseOrdersComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // ── Liste ─────────────────────────────────────────────────────────
  orders = signal<PurchaseOrderResponse[]>([]);
  loading = signal(true);
  statusFilter = signal<PurchaseOrderStatus | 'ALL'>('ALL');

  readonly statusOptions: Array<{ value: PurchaseOrderStatus | 'ALL'; label: string }> = [
    { value: 'ALL',       label: 'Tous' },
    { value: 'DRAFT',     label: 'Brouillon' },
    { value: 'ORDERED',   label: 'Commandé' },
    { value: 'PARTIAL',   label: 'Partiel' },
    { value: 'RECEIVED',  label: 'Reçu' },
    { value: 'CANCELLED', label: 'Annulé' },
  ];

  filteredOrders = computed(() => {
    const f = this.statusFilter();
    return f === 'ALL' ? this.orders() : this.orders().filter(o => o.status === f);
  });

  cancelConfirmId: number | null = null;

  // ── Drawer commun ─────────────────────────────────────────────────
  drawerMode: DrawerMode = null;
  drawerLoading = false;
  drawerError: string | null = null;

  // ── Détail / réception ────────────────────────────────────────────
  selectedOrder: PurchaseOrderResponse | null = null;
  detailLoading = false;

  // ── Formulaire création ───────────────────────────────────────────
  suppliers = signal<SupplierResponse[]>([]);
  products  = signal<ProductResponse[]>([]);
  productSearch = '';

  form: PurchaseOrderRequest = this.emptyForm();
  draftItems: DraftItem[] = [];

  addingProduct = false;
  newItem: Partial<DraftItem> = this.emptyDraftItem();

  // ── Réception ─────────────────────────────────────────────────────
  receiveLines: ReceiveLine[] = [];
  receiveForm: { receivedDate: string; receivedBy: string; notes: string } = {
    receivedDate: new Date().toISOString().slice(0, 10),
    receivedBy: '',
    notes: '',
  };

  constructor(
    private poService: PurchaseOrderService,
    private supplierService: SupplierService,
    private productService: ProductService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.supplierService.getAll().subscribe(res => {
      this.suppliers.set(res.data ?? []);
      this.cdr.markForCheck();
    });
    this.productService.getProducts({ size: 500, active: true }).subscribe(res => {
      this.products.set(res.data?.content ?? []);
      this.cdr.markForCheck();
    });
    this.wsService.staffEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event.module === 'purchase-orders') this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chargement ────────────────────────────────────────────────────

  load(): void {
    this.loading.set(true);
    this.poService.getAll().subscribe({
      next: res => { this.orders.set(res.data ?? []); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  // ── Filtres ───────────────────────────────────────────────────────

  setFilter(f: PurchaseOrderStatus | 'ALL'): void {
    this.statusFilter.set(f);
    this.cdr.markForCheck();
  }

  // ── Création ──────────────────────────────────────────────────────

  openCreate(): void {
    this.form = this.emptyForm();
    this.draftItems = [];
    this.addingProduct = false;
    this.newItem = this.emptyDraftItem();
    this.drawerError = null;
    this.drawerMode = 'create';
  }

  addItem(): void {
    if (!this.newItem.productId || !this.newItem.quantity || !this.newItem.unitPurchasePrice) return;
    const product = this.products().find(p => p.id === Number(this.newItem.productId));
    if (!product) return;

    const transport = this.newItem.transportCost ?? 0;
    const customs   = this.newItem.customsDuty ?? 0;
    const other     = this.newItem.otherCosts ?? 0;
    const qty       = this.newItem.quantity ?? 1;
    const unitPurchasePrice = this.newItem.unitPurchasePrice ?? 0;
    const unitCostPreview   = unitPurchasePrice + (transport + customs + other) / qty;

    this.draftItems.push({
      productId:        product.id,
      productName:      product.name,
      quantity:         qty,
      unitPurchasePrice,
      transportCost:    transport,
      customsDuty:      customs,
      otherCosts:       other,
      unitCostPreview:  Math.round(unitCostPreview),
    });
    this.newItem = this.emptyDraftItem();
    this.addingProduct = false;
    this.productSearch = '';
    this.cdr.markForCheck();
  }

  removeItem(i: number): void {
    this.draftItems.splice(i, 1);
    this.cdr.markForCheck();
  }

  get filteredProducts(): ProductResponse[] {
    const q = this.productSearch.toLowerCase();
    return q
      ? this.products().filter(p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
      : this.products().slice(0, 20);
  }

  selectProduct(p: ProductResponse): void {
    this.newItem.productId   = p.id;
    this.newItem.productName = p.name;
    this.newItem.unitPurchasePrice = p.costPrice ?? undefined;
    this.productSearch = p.name;
    this.addingProduct = false;
    this.cdr.markForCheck();
  }

  get draftTotal(): number {
    return this.draftItems.reduce((acc, i) => acc + (i.unitCostPreview ?? 0) * i.quantity, 0);
  }

  saveCreate(): void {
    if (!this.form.supplierId) { this.drawerError = 'Sélectionnez un fournisseur'; return; }
    if (!this.form.orderDate)  { this.drawerError = 'La date de commande est obligatoire'; return; }
    if (!this.draftItems.length) { this.drawerError = 'Ajoutez au moins un article'; return; }

    this.drawerLoading = true;
    this.drawerError = null;
    const req: PurchaseOrderRequest = {
      ...this.form,
      items: this.draftItems.map(i => ({
        productId:        i.productId,
        quantity:         i.quantity,
        unitPurchasePrice: i.unitPurchasePrice,
        transportCost:    i.transportCost,
        customsDuty:      i.customsDuty,
        otherCosts:       i.otherCosts,
      })),
    };

    this.poService.create(req).subscribe({
      next: res => {
        if (res.success) {
          this.toast.show('Bon de commande créé', 'success');
          this.drawerMode = null;
          this.load();
        } else {
          this.drawerError = res.message ?? 'Erreur';
        }
        this.drawerLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.drawerError = err?.error?.message ?? 'Erreur serveur';
        this.drawerLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Détail ────────────────────────────────────────────────────────

  openDetail(order: PurchaseOrderResponse): void {
    this.selectedOrder = order;
    this.drawerError = null;
    this.drawerMode = 'detail';
    this.detailLoading = true;
    this.poService.getById(order.id).subscribe({
      next: res => {
        this.selectedOrder = res.data ?? order;
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.detailLoading = false; this.cdr.markForCheck(); },
    });
  }

  // ── Annulation ────────────────────────────────────────────────────

  confirmCancel(id: number): void { this.cancelConfirmId = id; this.cdr.markForCheck(); }
  abortCancel(): void { this.cancelConfirmId = null; this.cdr.markForCheck(); }

  doCancel(id: number): void {
    this.poService.cancel(id).subscribe({
      next: res => {
        if (res.success) {
          this.toast.show('Bon de commande annulé', 'success');
          this.cancelConfirmId = null;
          if (this.drawerMode === 'detail') this.drawerMode = null;
          this.load();
          this.cdr.markForCheck();
        }
      },
      error: err => this.toast.show(err?.error?.message ?? 'Erreur', 'error'),
    });
  }

  // ── Réception ─────────────────────────────────────────────────────

  openReceive(): void {
    if (!this.selectedOrder?.items) return;
    this.receiveLines = this.selectedOrder.items
      .filter(i => !i.fullyReceived)
      .map(i => ({ item: i, qty: i.quantity - i.receivedQuantity }));
    this.receiveForm = {
      receivedDate: new Date().toISOString().slice(0, 10),
      receivedBy: '',
      notes: '',
    };
    this.drawerError = null;
    this.drawerMode = 'receive';
    this.cdr.markForCheck();
  }

  saveReceive(): void {
    if (!this.selectedOrder) return;
    if (!this.receiveForm.receivedBy.trim()) { this.drawerError = 'Le nom du réceptionneur est obligatoire'; return; }

    const lines: GoodsReceiptItemRequest[] = this.receiveLines
      .filter(l => l.qty > 0)
      .map(l => ({ itemId: l.item.id, receivedQuantity: l.qty }));

    if (!lines.length) { this.drawerError = 'Aucune quantité à réceptionner'; return; }

    const req: GoodsReceiptRequest = {
      receivedDate: this.receiveForm.receivedDate,
      receivedBy:   this.receiveForm.receivedBy.trim(),
      notes:        this.receiveForm.notes || undefined,
      items:        lines,
    };

    this.drawerLoading = true;
    this.drawerError = null;
    this.poService.receive(this.selectedOrder.id, req).subscribe({
      next: res => {
        if (res.success) {
          this.toast.show('Réception enregistrée — stock et CMUP mis à jour', 'success');
          this.selectedOrder = res.data ?? null;
          this.drawerMode = 'detail';
          this.load();
        } else {
          this.drawerError = res.message ?? 'Erreur';
        }
        this.drawerLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.drawerError = err?.error?.message ?? 'Erreur serveur';
        this.drawerLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  backToDetail(): void {
    this.drawerMode = 'detail';
    this.cdr.markForCheck();
  }

  // ── Drawer ────────────────────────────────────────────────────────

  closeDrawer(): void {
    this.drawerMode = null;
    this.cancelConfirmId = null;
    this.cdr.markForCheck();
  }

  // ── Helpers ───────────────────────────────────────────────────────

  statusLabel(s: PurchaseOrderStatus): string {
    const map: Record<PurchaseOrderStatus, string> = {
      DRAFT: 'Brouillon', ORDERED: 'Commandé', PARTIAL: 'Partiel',
      RECEIVED: 'Reçu', CANCELLED: 'Annulé',
    };
    return map[s] ?? s;
  }

  statusClass(s: PurchaseOrderStatus): string {
    const map: Record<PurchaseOrderStatus, string> = {
      DRAFT:     'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
      ORDERED:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
      PARTIAL:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
      RECEIVED:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      CANCELLED: 'bg-red-500/15 text-red-400 border-red-500/20',
    };
    return map[s] ?? '';
  }

  canReceive(s: PurchaseOrderStatus): boolean {
    return s === 'ORDERED' || s === 'PARTIAL';
  }

  canEdit(s: PurchaseOrderStatus): boolean {
    return s === 'DRAFT' || s === 'ORDERED' || s === 'PARTIAL';
  }

  canCancel(s: PurchaseOrderStatus): boolean {
    return s !== 'RECEIVED' && s !== 'CANCELLED';
  }

  formatAmount(v: number): string {
    return v.toLocaleString('fr-FR') + ' F';
  }

  private emptyForm(): PurchaseOrderRequest {
    return {
      supplierId:           0,
      orderDate:            new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: undefined,
      status:               'DRAFT',
      notes:                undefined,
    };
  }

  private emptyDraftItem(): Partial<DraftItem> {
    return { productId: undefined, productName: '', quantity: 1, unitPurchasePrice: 0, transportCost: 0, customsDuty: 0, otherCosts: 0 };
  }
}
