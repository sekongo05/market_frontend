import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { CartItem, CartService } from './core/services/cart.service';
import { CategoryService } from './core/services/category.service';
import { DashboardService } from './core/services/dashboard.service';
import { ProductService } from './core/services/product.service';
import { PromoService } from './core/services/promo.service';
import { ReviewService } from './core/services/review.service';
import { ToastService } from './core/services/toast.service';
import { WebSocketService } from './core/services/websocket.service';
import { WishlistService } from './core/services/wishlist.service';
import { HomeComponent } from './home.component';

describe('HomeComponent (Maison de Luxe & SSR)', () => {
  let cartSubject: BehaviorSubject<CartItem[]>;
  let favSubject: BehaviorSubject<Set<number>>;

  beforeEach(async () => {
    cartSubject = new BehaviorSubject<CartItem[]>([]);
    favSubject = new BehaviorSubject<Set<number>>(new Set());

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: AuthService, useValue: { currentUser$: of(null) } },
        {
          provide: ProductService,
          useValue: {
            getFeaturedProducts: () => of({ success: true, data: [] }),
            getBestsellers: () => of({ success: true, data: [] }),
            getProducts: () => of({ success: true, data: { content: [] } }),
          },
        },
        { provide: ReviewService, useValue: { getFeaturedReviews: () => of({ success: true, data: [] }) } },
        { provide: CategoryService, useValue: { getCategories: () => of({ success: true, data: [] }) } },
        { provide: DashboardService, useValue: { getPublicStats: () => of({ success: true, data: null }) } },
        { provide: PromoService, useValue: { getActivePromos: () => of({ success: true, data: [] }) } },
        { provide: WebSocketService, useValue: { stockUpdate$: new Subject() } },
        { provide: ToastService, useValue: { info: () => {}, success: () => {} } },
        {
          provide: CartService,
          useValue: {
            cart$: cartSubject.asObservable(),
            get cartValue() { return cartSubject.value; },
            addToCart: () => {},
          },
        },
        {
          provide: WishlistService,
          useValue: {
            favoriteIds$: favSubject.asObservable(),
            toggle: () => true,
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    const doc = TestBed.inject(DOCUMENT);
    doc.getElementById('json-ld-structured')?.remove();
  });

  it('injects ClothingStore JSON-LD and meta tags during ngOnInit (SSR)', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    const doc = TestBed.inject(DOCUMENT);
    const ldScript = doc.getElementById('json-ld-structured');
    expect(ldScript).toBeTruthy();
    const parsed = JSON.parse(ldScript!.textContent || '{}');
    expect(parsed['@type']).toBe('ClothingStore');
    expect(parsed.name).toBe('SDM STORE');
  });

  it('updates cartProductIds and favoriteIds immutably when streams emit', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    const initialCart = comp.cartProductIds();
    cartSubject.next([
      { productId: 42, productName: 'Montre Classique', price: 45000, quantity: 1, imageUrl: '/seko.webp', maxStock: 5 },
    ]);
    expect(comp.cartProductIds()).not.toBe(initialCart);
    expect(comp.cartProductIds().has(42)).toBe(true);

    const initialFavs = comp.favoriteIds();
    favSubject.next(new Set([7]));
    expect(comp.favoriteIds()).not.toBe(initialFavs);
    expect(comp.favoriteIds().has(7)).toBe(true);
  });

  it('renders the flagship watch hero and the 3-universe strip on initial paint', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const heroImgs = host.querySelectorAll('app-home-hero img');
    expect(heroImgs.length).toBe(4);
    expect(heroImgs[0].getAttribute('fetchpriority')).toBe('high');
  });

  it('switches showcase tabs cleanly between Selection, Nouveautes and Bestsellers', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const newTabBtn = host.querySelector('#showcase-tab-new') as HTMLButtonElement;
    expect(newTabBtn).toBeTruthy();
    newTabBtn.click();
    fixture.detectChanges();

    expect(newTabBtn.getAttribute('aria-selected')).toBe('true');
  });
});
