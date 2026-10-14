import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  testFirestoreConnection,
  auth,
} from './lib/firebase';
import {
  seedProductsIfEmpty,
  subscribeToProducts,
  subscribeToOrders,
  subscribeToStockMutations,
  subscribeToPosTransactions,
} from './lib/firestoreService';
import { Product, CartItem, Order, StockMutation, PosTransaction } from './types';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { InsoleGuideModal } from './components/InsoleGuideModal';
import { Footer } from './components/Footer';
import { AdminPortal } from './components/admin/AdminPortal';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { Sparkles, ShieldCheck, Footprints, RefreshCw, Heart, ArrowRight } from 'lucide-react';

export default function App() {
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mutations, setMutations] = useState<StockMutation[]>([]);
  const [posTransactions, setPosTransactions] = useState<PosTransaction[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);

  // Modals & Navigation
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProductDetail, setActiveProductDetail] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string>('');
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState<boolean>(false);
  const [trackingInitialKey, setTrackingInitialKey] = useState<string>('');
  const [isInsoleGuideOpen, setIsInsoleGuideOpen] = useState<boolean>(false);

  // Admin Portal & Auth
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('admin@mochisteps.com');
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  const [currentRoute, setCurrentRoute] = useState<string>(() => window.location.hash);

  const productSectionRef = useRef<HTMLDivElement>(null);

  // Listen to URL hash for admin portal: /#/masuk
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      setCurrentRoute(hash);
      if (hash === '#/masuk') {
        if (!isAdminLoggedIn) {
          setIsAdminLoginModalOpen(true);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [isAdminLoggedIn]);

  // Initialize Firestore, test connection, seed if empty, and subscribe to real-time collections
  useEffect(() => {
    let unsubscribeProducts: (() => void) | null = null;
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribeMutations: (() => void) | null = null;
    let unsubscribePos: (() => void) | null = null;

    const setupDatabase = async () => {
      try {
        const connected = await testFirestoreConnection();
        setIsFirestoreConnected(connected);

        // Seed 12 products if empty & sync pricing/status
        await seedProductsIfEmpty();

        // Subscribe to Products
        unsubscribeProducts = subscribeToProducts((prods) => {
          setProducts(prods);
          setIsFirestoreConnected(true);
          setIsLoadingInitial(false);
        });

        // Subscribe to Orders
        unsubscribeOrders = subscribeToOrders((ords) => {
          setOrders(ords);
        });

        // Subscribe to Stock Mutations
        unsubscribeMutations = subscribeToStockMutations((muts) => {
          setMutations(muts);
        });

        // Subscribe to POS Transactions
        unsubscribePos = subscribeToPosTransactions((txs) => {
          setPosTransactions(txs);
        });
      } catch (err) {
        console.error('Firestore initialization error:', err);
        setIsLoadingInitial(false);
      }
    };

    setupDatabase();

    return () => {
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeMutations) unsubscribeMutations();
      if (unsubscribePos) unsubscribePos();
    };
  }, []);

  // Filtered Products for Webstore Catalog (Only active products)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const isActive = p.isActive !== false;
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return isActive && matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const handleAddToCart = (product: Product, size: number, quantity: number = 1) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (it) => it.product.id === product.id && it.selectedSize === size
      );
      if (existingIdx > -1) {
        const updated = [...prevCart];
        const newQty = Math.min(product.stock, updated[existingIdx].quantity + quantity);
        updated[existingIdx] = { ...updated[existingIdx], quantity: newQty };
        return updated;
      }
      return [...prevCart, { product, selectedSize: size, quantity }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, size: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId, size);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((it) =>
        it.product.id === productId && it.selectedSize === size
          ? { ...it, quantity: Math.min(it.product.stock, newQty) }
          : it
      )
    );
  };

  const handleRemoveCartItem = (productId: string, size: number) => {
    setCart((prevCart) =>
      prevCart.filter(
        (it) => !(it.product.id === productId && it.selectedSize === size)
      )
    );
  };

  const handleBuyNow = (product: Product, size: number, quantity: number) => {
    handleAddToCart(product, size, quantity);
    setActiveProductDetail(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, it) => sum + it.quantity, 0);
  }, [cart]);

  // Scroll to products
  const scrollToProducts = () => {
    productSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // If route is /#/masuk and not yet logged in, show full-page luxury login screen
  if (currentRoute === '#/masuk' && !isAdminLoggedIn) {
    return (
      <AdminLoginModal
        isOpen={true}
        isFullPage={true}
        onClose={() => {
          window.location.hash = '';
          setCurrentRoute('');
          setIsAdminLoginModalOpen(false);
        }}
        onLoginSuccess={(email) => {
          setAdminEmail(email);
          setIsAdminLoggedIn(true);
          setIsAdminLoginModalOpen(false);
          window.location.hash = '#/masuk';
          setCurrentRoute('#/masuk');
        }}
      />
    );
  }

  // If Admin is logged in, show Admin Portal
  if (isAdminLoggedIn) {
    return (
      <AdminPortal
        adminEmail={adminEmail}
        onLogout={() => {
          setIsAdminLoggedIn(false);
          window.location.hash = '';
          setCurrentRoute('');
        }}
        products={products}
        orders={orders}
        mutations={mutations}
        posTransactions={posTransactions}
        isFirestoreConnected={isFirestoreConnected}
        onReturnToStore={() => {
          setIsAdminLoggedIn(false);
          window.location.hash = '';
          setCurrentRoute('');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9fa] text-[#2d2226] flex flex-col font-sans selection:bg-pink-200 selection:text-pink-900">
      
      {/* Navbar */}
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenInsoleGuide={() => setIsInsoleGuideOpen(true)}
        onOpenOrderTracking={() => setIsOrderTrackingOpen(true)}
        onLogoAdminTrigger={() => setIsAdminLoginModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          scrollToProducts();
        }}
        isFirestoreConnected={isFirestoreConnected}
      />

      {/* Hero Section with Framer Motion */}
      <HeroSection
        onExploreClick={scrollToProducts}
        onOpenInsoleGuide={() => setIsInsoleGuideOpen(true)}
      />

      {/* 3 Keunggulan Mochi Cushion Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-3xl bg-white border border-pink-100/90 shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#fdf0f4] text-[#d65b7d] flex items-center justify-center shrink-0">
              <Footprints className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-gray-900">
                Busa CloudMochi 8mm
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Insole memory foam berdaya pantul kenyal seperti kue mochi. Mengurangi tekanan tumit hingga 60%.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-pink-100/90 shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#fdf0f4] text-[#d65b7d] flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-gray-900">
                Lining Velvet Anti-Lecet
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Kerah tumit dilapisi bantalan bulu halus. Langsung nyaman dipakai jalan seharian tanpa perlu di-break in.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-pink-100/90 shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#fdf0f4] text-[#d65b7d] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-gray-900">
                Garansi Tukar Size 7 Hari
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Salah pilih ukuran? Tukar ukuran sepatu baru dengan mudah dan cepat tanpa dipersulit via customer service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Product Catalog Section */}
      <section ref={productSectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100/80 text-[#be185d] text-xs font-bold font-heading mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>12 Model Eksklusif • 3 Kategori</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-gray-900 tracking-tight">
              Koleksi Flatshoes Mochi Steps
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Foto asli real-life dengan pencahayaan lembut. Sentuh untuk melihat detail busa mochi.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Semua (12)' },
              { id: 'Flat Shoes Klasik', label: 'Klasik' },
              { id: 'Pointed Elegant', label: 'Pointed' },
              { id: 'Loafers & Slip-on', label: 'Loafers' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-pink-50 border border-pink-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {isLoadingInitial ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#be185d] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500 font-medium">Memuat katalog flatshoes dari Firestore...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-pink-100 p-8 space-y-3">
            <div className="text-4xl">🔍</div>
            <h3 className="font-heading font-bold text-gray-800 text-base">
              Flatshoes Tidak Ditemukan
            </h3>
            <p className="text-xs text-gray-500">
              Coba kata kunci pencarian lain atau pilih kategori Semua Sepatu.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 rounded-xl bg-pink-100 text-[#be185d] font-bold text-xs"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={(p, size) => handleAddToCart(p, size, 1)}
                onOpenDetail={(p) => setActiveProductDetail(p)}
              />
            ))}
          </div>
        )}
      </section>



      {/* Floating Cart Button for Quick Mobile Access */}
      {totalCartCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-[#d65b7d] via-[#e26d8d] to-[#be185d] text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer"
        >
          <span className="font-heading font-extrabold text-xs">
            {totalCartCount} item di keranjang
          </span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* Footer */}
      <Footer
        onOpenInsoleGuide={() => setIsInsoleGuideOpen(true)}
        onOpenOrderTracking={() => setIsOrderTrackingOpen(true)}
        onFilterCategory={(cat) => {
          setSelectedCategory(cat);
          scrollToProducts();
        }}
        onSecretAdminClick={() => setIsAdminLoginModalOpen(true)}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={activeProductDetail}
        onClose={() => setActiveProductDetail(null)}
        onAddToCart={(p, size, qty) => handleAddToCart(p, size, qty)}
        onBuyNow={handleBuyNow}
        onOpenInsoleGuide={() => {
          setActiveProductDetail(null);
          setIsInsoleGuideOpen(true);
        }}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        onOrderSuccess={(orderId, orderNum) => {
          setIsCheckoutOpen(false);
          setCart([]);
          setCompletedOrderNumber(orderNum);
          setIsSuccessModalOpen(true);
        }}
      />

      {/* Order Success Modal */}
      <OrderSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        orderNumber={completedOrderNumber}
        onTrackOrder={(ordNum) => {
          setIsSuccessModalOpen(false);
          setTrackingInitialKey(ordNum);
          setIsOrderTrackingOpen(true);
        }}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isOrderTrackingOpen}
        onClose={() => setIsOrderTrackingOpen(false)}
        orders={orders}
        initialSearch={trackingInitialKey}
      />

      {/* Insole & Size Guide Modal */}
      <InsoleGuideModal
        isOpen={isInsoleGuideOpen}
        onClose={() => setIsInsoleGuideOpen(false)}
      />

      {/* Secret Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={(email) => {
          setAdminEmail(email);
          setIsAdminLoggedIn(true);
          setIsAdminLoginModalOpen(false);
          window.location.hash = '#/masuk';
          setCurrentRoute('#/masuk');
        }}
      />
    </div>
  );
}
