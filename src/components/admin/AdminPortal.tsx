import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Users,
  CheckCircle,
  TrendingUp,
  Boxes,
  Package,
  Search,
  Filter,
  LogOut,
  MessageCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock,
  Truck,
  Check,
  X,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Edit2,
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  Receipt,
  Store,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  Order,
  Product,
  StockMutation,
  CustomerSummary,
  OrderStatus,
  PaymentStatus,
  PosTransaction,
} from '../../types';
import {
  approvePayment,
  rejectPayment,
  updateOrderStatus,
  recordManualStockMutation,
  recordStockCorrection,
  updateProductDetails,
  addNewProduct,
  toggleProductActiveStatus,
} from '../../lib/firestoreService';
import { MochiLogo } from '../MochiLogo';
import { FlatshoeImage } from '../FlatshoeImage';
import { PosCashier } from './PosCashier';
import { ProductPricingCalculator } from './ProductPricingCalculator';

interface AdminPortalProps {
  adminEmail: string;
  onLogout: () => void;
  products: Product[];
  orders: Order[];
  mutations: StockMutation[];
  posTransactions?: PosTransaction[];
  isFirestoreConnected: boolean;
  onReturnToStore?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  adminEmail,
  onLogout,
  products,
  orders,
  mutations,
  posTransactions = [],
  isFirestoreConnected,
  onReturnToStore,
}) => {
  // Navigation Tabs: 8 required modules
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'products' | 'inventory' | 'pos' | 'orders' | 'customers' | 'approval' | 'sales'
  >('dashboard');

  // Search and Filter States for Orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState<string>('all');
  const [orderPaymentMethodFilter, setOrderPaymentMethodFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // Ubah Status Pesanan Modal & Toast State
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [newSelectedStatus, setNewSelectedStatus] = useState<OrderStatus>('Menunggu Pembayaran');
  const [trackingNumberInput, setTrackingNumberInput] = useState<string>('');
  const [isCancellationConfirmed, setIsCancellationConfirmed] = useState<boolean>(false);
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleOpenStatusModal = (ord: Order) => {
    setStatusModalOrder(ord);
    setNewSelectedStatus(ord.orderStatus || 'Menunggu Pembayaran');
    setTrackingNumberInput(ord.trackingNumber || '');
    setIsCancellationConfirmed(false);
  };

  const handleSaveStatusChange = async () => {
    if (!statusModalOrder) return;
    if (newSelectedStatus === 'Dibatalkan' && !isCancellationConfirmed) {
      return;
    }

    setIsSavingStatus(true);
    try {
      await updateOrderStatus(statusModalOrder.id, newSelectedStatus, {
        trackingNumber:
          newSelectedStatus === 'Dikirim'
            ? trackingNumberInput.trim()
            : statusModalOrder.trackingNumber || '',
        cancellationReason:
          newSelectedStatus === 'Dibatalkan' ? 'Pembatalan via Admin Data Order' : undefined,
        actor: adminEmail.split('@')[0] || 'Admin',
        orderData: statusModalOrder,
      });

      setStatusModalOrder(null);
      showToast('Status pesanan berhasil diperbarui.');
    } catch (err) {
      console.error('Failed to update order status:', err);
      showToast('Gagal memperbarui status pesanan. Silakan coba lagi.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const getOrderStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Menunggu Pembayaran':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Dibayar':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Diproses':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'Dikemas':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'Dikirim':
        return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      case 'Selesai':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Dibatalkan':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Menunggu Verifikasi':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Disetujui':
        return 'bg-teal-50 text-teal-700 border border-teal-200';
      case 'Ditolak':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  // Search States for Customers
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<CustomerSummary | null>(null);

  // Search and Filter States for Approval
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('Menunggu Verifikasi');

  // Stock Mutation Modal & Filter State
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalType, setStockModalType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [stockModalProductId, setStockModalProductId] = useState(products[0]?.id || '');
  const [stockModalQty, setStockModalQty] = useState<number>(10);
  const [stockModalNotes, setStockModalNotes] = useState('');
  const [stockMutationFilter, setStockMutationFilter] = useState<string>('all');

  // Stock Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionTargetMutationId, setCorrectionTargetMutationId] = useState('');
  const [correctionProductId, setCorrectionProductId] = useState(products[0]?.id || '');
  const [correctionDelta, setCorrectionDelta] = useState<number>(1);
  const [correctionReason, setCorrectionReason] = useState('');

  // Products Tab Filter & Modals
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  // New Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<'Flat Shoes Klasik' | 'Pointed Elegant' | 'Loafers & Slip-on'>('Flat Shoes Klasik');
  const [newProdCostPrice, setNewProdCostPrice] = useState<number>(80000);
  const [newProdPrice, setNewProdPrice] = useState<number>(159000);
  const [newProdStock, setNewProdStock] = useState<number>(20);
  const [newProdColor, setNewProdColor] = useState('Pastel Rose Pink');
  const [newProdDesc, setNewProdDesc] = useState('Flatshoes berbusa mochi 8mm yang empuk anti lecet.');
  const [newProdImage, setNewProdImage] = useState('/shoes/mochi-flat-01.jpg');
  const [newProdSku, setNewProdSku] = useState('MC-13');

  // Sales Report Period Filter
  const [salesPeriod, setSalesPeriod] = useState<'today' | '7days' | 'month' | 'all'>('all');
  const [selectedSourceTx, setSelectedSourceTx] = useState<{
    id: string;
    channel: 'Online' | 'POS';
    number: string;
    date: string;
    customer: string;
    total: number;
    cost: number;
    profit: number;
    items: any[];
  } | null>(null);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Compile unique Customers list
  const customersList: CustomerSummary[] = useMemo(() => {
    const map = new Map<string, CustomerSummary>();

    orders.forEach((ord) => {
      const cleanPhone = ord.customerPhone.trim();
      const existing = map.get(cleanPhone);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += ord.totalAmount;
        if (new Date(ord.createdAt) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = ord.createdAt;
        }
        existing.orders.push(ord);
      } else {
        map.set(cleanPhone, {
          phone: ord.customerPhone,
          name: ord.customerName,
          address: ord.customerAddress,
          district: ord.district,
          city: ord.city,
          postalCode: ord.postalCode,
          totalOrders: 1,
          totalSpent: ord.totalAmount,
          lastOrderDate: ord.createdAt,
          orders: [ord],
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
    );
  }, [orders]);

  // Unified Sales Realization: Paid Online Orders + Completed POS Transactions
  const salesStats = useMemo(() => {
    const now = new Date();
    const filterByDate = (dateStr: string) => {
      if (salesPeriod === 'all') return true;
      const d = new Date(dateStr);
      if (salesPeriod === 'today') {
        return d.toDateString() === now.toDateString();
      }
      if (salesPeriod === '7days') {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (salesPeriod === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    };

    // Filter paid orders
    const paidOrders = orders.filter((o) => o.paymentStatus === 'Lunas' && filterByDate(o.createdAt));
    // Filter POS transactions
    const filteredPos = posTransactions.filter((p) => filterByDate(p.createdAt));

    let onlineRevenue = 0;
    let onlineCost = 0;
    let onlineUnits = 0;

    paidOrders.forEach((o) => {
      onlineRevenue += o.totalAmount;
      o.items.forEach((it) => {
        onlineUnits += it.quantity;
        const itemCost = it.costPrice || Math.round(it.price * 0.5);
        onlineCost += itemCost * it.quantity;
      });
    });

    let posRevenue = 0;
    let posCost = 0;
    let posUnits = 0;

    filteredPos.forEach((p) => {
      posRevenue += p.totalAmount;
      posCost += p.totalCost;
      posUnits += p.totalItems;
    });

    const totalRevenue = onlineRevenue + posRevenue;
    const totalCost = onlineCost + posCost;
    const grossProfit = totalRevenue - totalCost;
    const totalTransactions = paidOrders.length + filteredPos.length;
    const totalUnitsSold = onlineUnits + posUnits;
    const aov = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
    const grossProfitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

    // Top selling products & Category breakdown
    const productMap = new Map<string, { name: string; units: number; revenue: number }>();
    const categoryMap = new Map<string, number>();

    const recordItemSale = (name: string, category: string, qty: number, price: number) => {
      const existingP = productMap.get(name) || { name, units: 0, revenue: 0 };
      existingP.units += qty;
      existingP.revenue += price * qty;
      productMap.set(name, existingP);

      const catRev = categoryMap.get(category) || 0;
      categoryMap.set(category, catRev + price * qty);
    };

    paidOrders.forEach((o) => {
      o.items.forEach((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const cat = prod?.category || 'Flat Shoes Klasik';
        recordItemSale(it.name, cat, it.quantity, it.price);
      });
    });

    filteredPos.forEach((p) => {
      p.items.forEach((it) => {
        recordItemSale(it.name, it.category || 'Flat Shoes Klasik', it.quantity, it.price);
      });
    });

    const topSellingProducts = Array.from(productMap.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    // Unified realized transactions list for drilldown
    const combinedRealizedTx = [
      ...paidOrders.map((o) => {
        const cost = o.items.reduce((s, it) => s + (it.costPrice || Math.round(it.price * 0.5)) * it.quantity, 0);
        return {
          id: o.id,
          channel: 'Online' as const,
          number: o.orderNumber,
          date: o.createdAt,
          customer: o.customerName,
          total: o.totalAmount,
          cost,
          profit: o.totalAmount - cost,
          items: o.items,
        };
      }),
      ...filteredPos.map((p) => ({
        id: p.id,
        channel: 'POS' as const,
        number: p.posNumber,
        date: p.createdAt,
        customer: p.customerName || 'Walk-in Customer',
        total: p.totalAmount,
        cost: p.totalCost,
        profit: p.grossProfit,
        items: p.items,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      grossProfitMargin,
      totalTransactions,
      totalUnitsSold,
      aov,
      onlineRevenue,
      onlineTransactions: paidOrders.length,
      onlineUnits,
      posRevenue,
      posTransactions: filteredPos.length,
      posUnits,
      topSellingProducts,
      categoryRevenueMap: categoryMap,
      combinedRealizedTx,
    };
  }, [orders, posTransactions, products, salesPeriod]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customerPhone.includes(orderSearch) ||
        o.city.toLowerCase().includes(orderSearch.toLowerCase());
      const matchPaymentStatus =
        orderPaymentStatusFilter === 'all' || o.paymentStatus === orderPaymentStatusFilter;
      const matchPaymentMethod =
        orderPaymentMethodFilter === 'all' || o.paymentMethod.includes(orderPaymentMethodFilter);
      const matchOrderStatus =
        orderStatusFilter === 'all' || o.orderStatus === orderStatusFilter;
      return matchSearch && matchPaymentStatus && matchPaymentMethod && matchOrderStatus;
    });
  }, [orders, orderSearch, orderPaymentStatusFilter, orderPaymentMethodFilter, orderStatusFilter]);

  // Filtered Products
  const filteredProductsList = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
        p.color.toLowerCase().includes(productSearch.toLowerCase());
      const matchCategory =
        productCategoryFilter === 'all' || p.category === productCategoryFilter;
      const matchStatus =
        productStatusFilter === 'all' ||
        (productStatusFilter === 'active' && p.isActive !== false) ||
        (productStatusFilter === 'inactive' && p.isActive === false);
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, productSearch, productCategoryFilter, productStatusFilter]);

  // Filtered Mutations
  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      if (stockMutationFilter === 'all') return true;
      return m.type === stockMutationFilter;
    });
  }, [mutations, stockMutationFilter]);

  // Handler: Add New Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    try {
      await addNewProduct({
        name: newProdName.trim(),
        category: newProdCategory,
        costPrice: Number(newProdCostPrice) || 80000,
        price: Number(newProdPrice) || 159000,
        stock: Number(newProdStock) || 0,
        sizes: [36, 37, 38, 39, 40, 41],
        description: newProdDesc.trim(),
        imageUrl: newProdImage.trim() || '/shoes/mochi-flat-01.jpg',
        color: newProdColor.trim(),
        badge: 'Koleksi Terbaru',
        rating: 5.0,
        reviewCount: 1,
        material: 'Premium Mochi Cushion',
        heelHeight: '1 cm Flat',
        sku: newProdSku.trim() || `MC-${products.length + 1}`,
        isActive: true,
      });

      setIsNewProductModalOpen(false);
      setNewProdName('');
      setNewProdStock(20);
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  // Handler: Save Edit Product
  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await updateProductDetails(editingProduct.id, {
        name: editingProduct.name,
        category: editingProduct.category,
        costPrice: Number(editingProduct.costPrice) || 80000,
        price: Number(editingProduct.price) || 159000,
        stock: Number(editingProduct.stock) || 0,
        color: editingProduct.color,
        description: editingProduct.description,
        imageUrl: editingProduct.imageUrl,
        sku: editingProduct.sku,
        isActive: editingProduct.isActive !== false,
      });
      setEditingProduct(null);
    } catch (err) {
      console.error('Failed to update product:', err);
    }
  };

  // Handler: Record Stock Mutation
  const handleRecordMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProductId || stockModalQty <= 0) return;

    try {
      await recordManualStockMutation(
        stockModalProductId,
        stockModalType,
        Number(stockModalQty),
        stockModalNotes.trim() ||
          (stockModalType === 'IN' ? 'Restock Gudang Mochi Steps' : 'Penyesuaian Manual'),
        adminEmail.split('@')[0] || 'Admin'
      );
      setIsStockModalOpen(false);
      setStockModalQty(10);
      setStockModalNotes('');
    } catch (err) {
      console.error('Failed to record stock mutation:', err);
    }
  };

  // Handler: Record Compensating Stock Correction (Audit Trail)
  const handleRecordCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionReason.trim()) return;

    try {
      await recordStockCorrection(
        correctionTargetMutationId || 'MANUAL-AUDIT',
        correctionProductId,
        correctionDelta,
        correctionReason.trim(),
        adminEmail.split('@')[0] || 'Admin Audit'
      );
      setIsCorrectionModalOpen(false);
      setCorrectionReason('');
      setCorrectionDelta(1);
    } catch (err) {
      console.error('Failed to record stock correction:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6f7] text-[#2d2226] flex flex-col font-sans">
      {/* Top Bar / Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Portal Tag */}
            <div className="flex items-center gap-3">
              <MochiLogo size="sm" variant="compact" />
              <div className="hidden sm:block h-5 w-px bg-pink-200" />
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-pink-100 text-[#be185d]">
                Portal Admin & Kasir POS
              </span>
            </div>

            {/* User Profile & Return to Webstore */}
            <div className="flex items-center gap-3">
              {onReturnToStore && (
                <button
                  type="button"
                  onClick={onReturnToStore}
                  className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#be185d] border border-pink-200 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="Kembali ke Webstore Mochi Steps"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Ke Webstore</span>
                </button>
              )}

              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-gray-800">{adminEmail}</p>
                <p className="text-[10px] text-pink-600 font-medium">Administrator Toko</p>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Keluar dari Portal Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>

          {/* Navigation Bar (All 8 Required Tabs) */}
          <nav className="flex space-x-1 sm:space-x-1.5 overflow-x-auto py-2 scrollbar-none border-t border-gray-100">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'pos', label: 'POS Kasir Toko', icon: Store, badge: 'Kasir', badgeColor: 'bg-emerald-500 text-white' },
              { id: 'products', label: 'Produk & Harga', icon: Package, count: products.length },
              { id: 'inventory', label: 'Inventory & Mutasi', icon: Boxes, count: mutations.length },
              { id: 'orders', label: 'Order Webstore', icon: ShoppingBag, count: orders.length },
              { id: 'customers', label: 'Pelanggan', icon: Users, count: customersList.length },
              {
                id: 'approval',
                label: 'Approval Pembayaran',
                icon: CheckCircle,
                count: orders.filter((o) => o.orderStatus === 'Menunggu Verifikasi').length,
                badgeColor: 'bg-amber-500 text-white',
              },
              { id: 'sales', label: 'Laporan Sales', icon: TrendingUp },
            ].map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-extrabold ${tab.badgeColor}`}>
                      {tab.badge}
                    </span>
                  )}
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        active
                          ? 'bg-white/20 text-white'
                          : tab.badgeColor || 'bg-pink-100 text-[#be185d]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">

        {/* ================= TAB 1: DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Dashboard Ringkasan Eksekutif
                </h2>
                <p className="text-xs text-gray-500">
                  Gambaran performa bisnis Mochi Steps mencakup penjualan online dan offline kasir toko.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-xs hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
                >
                  <Store className="w-4 h-4" />
                  <span>+ Buka Kasir POS</span>
                </button>
              </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-pink-50 to-white border border-pink-200 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">Total Omzet Realisasi</p>
                <p className="text-xl sm:text-2xl font-extrabold font-heading text-[#be185d] mt-1">
                  {formatRupiah(salesStats.totalRevenue)}
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                  Online Lunas ({formatRupiah(salesStats.onlineRevenue)}) + POS ({formatRupiah(salesStats.posRevenue)})
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">Estimasi Laba Kotor</p>
                <p className="text-xl sm:text-2xl font-extrabold font-heading text-emerald-700 mt-1">
                  {formatRupiah(salesStats.grossProfit)}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Margin kotor {salesStats.grossProfitMargin}% dari snapshot HPP
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">Total Transaksi Selesai</p>
                <p className="text-xl sm:text-2xl font-extrabold font-heading text-gray-900 mt-1">
                  {salesStats.totalTransactions} Transaksi
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {salesStats.onlineTransactions} Webstore • {salesStats.posTransactions} POS Kasir
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">Total Unit Flatshoes</p>
                <p className="text-xl sm:text-2xl font-extrabold font-heading text-[#be185d] mt-1">
                  {salesStats.totalUnitsSold} Pasang
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Terjual ke seluruh Indonesia
                </p>
              </div>
            </div>

            {/* Quick Action Cards & Stock Alert */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Quick Actions */}
              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs space-y-3">
                <h3 className="font-heading font-bold text-sm text-gray-900">
                  Pintasan Aksi Cepat
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pos')}
                    className="p-3 rounded-2xl bg-[#fff7f9] border border-pink-100 text-left hover:bg-pink-100/60 transition-colors cursor-pointer"
                  >
                    <Store className="w-5 h-5 text-[#be185d] mb-1.5" />
                    <p className="font-bold text-xs text-gray-900">POS Kasir</p>
                    <p className="text-[10px] text-gray-500">Transaksi di toko</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('inventory');
                      setStockModalType('IN');
                      setIsStockModalOpen(true);
                    }}
                    className="p-3 rounded-2xl bg-[#f0fdf4] border border-emerald-100 text-left hover:bg-emerald-100/60 transition-colors cursor-pointer"
                  >
                    <Boxes className="w-5 h-5 text-emerald-600 mb-1.5" />
                    <p className="font-bold text-xs text-gray-900">Restock Barang</p>
                    <p className="text-[10px] text-gray-500">Catat stok masuk</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('approval')}
                    className="p-3 rounded-2xl bg-[#fffbeb] border border-amber-100 text-left hover:bg-amber-100/60 transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-5 h-5 text-amber-600 mb-1.5" />
                    <p className="font-bold text-xs text-gray-900">Verifikasi Bayar</p>
                    <p className="text-[10px] text-gray-500">Cek bukti transfer</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('sales')}
                    className="p-3 rounded-2xl bg-[#fdf4ff] border border-purple-100 text-left hover:bg-purple-100/60 transition-colors cursor-pointer"
                  >
                    <TrendingUp className="w-5 h-5 text-purple-600 mb-1.5" />
                    <p className="font-bold text-xs text-gray-900">Laporan Sales</p>
                    <p className="text-[10px] text-gray-500">Analitik & omzet</p>
                  </button>
                </div>
              </div>

              {/* Stock Alerts (Low Stock Warning) */}
              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs space-y-3 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Peringatan Stok Menipis (&lt; 15 Pasang)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className="text-xs font-bold text-[#be185d] hover:underline cursor-pointer"
                  >
                    Lihat Semua Inventory →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {products
                    .filter((p) => p.stock < 15)
                    .slice(0, 4)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-2xl bg-[#fff9fa] border border-pink-100 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{p.name}</p>
                          <p className="text-[11px] text-gray-500">{p.category}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-100 text-amber-800 shrink-0">
                          Sisa {p.stock}
                        </span>
                      </div>
                    ))}
                  {products.filter((p) => p.stock < 15).length === 0 && (
                    <p className="text-xs text-gray-400 py-3 text-center sm:col-span-2">
                      Semua stok aman & mencukupi di gudang.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Combined Transactions */}
            <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm text-gray-900">
                  Transaksi Realisasi Terbaru (Webstore Lunas & Kasir POS)
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className="text-xs font-bold text-[#be185d] hover:underline cursor-pointer"
                >
                  Buka Laporan Sales Lengkap →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="pb-2">Waktu</th>
                      <th className="pb-2">Channel</th>
                      <th className="pb-2">No. Transaksi</th>
                      <th className="pb-2">Pelanggan</th>
                      <th className="pb-2 text-right">Total Belanja</th>
                      <th className="pb-2 text-right">Laba Kotor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {salesStats.combinedRealizedTx.slice(0, 5).map((tx) => (
                      <tr key={tx.id} className="hover:bg-pink-50/30">
                        <td className="py-2.5 text-gray-500">
                          {new Date(tx.date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              tx.channel === 'POS'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-pink-50 text-[#be185d] border border-pink-200'
                            }`}
                          >
                            {tx.channel}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono font-bold text-gray-900">{tx.number}</td>
                        <td className="py-2.5 text-gray-700">{tx.customer}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-[#be185d]">
                          {formatRupiah(tx.total)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-emerald-700 font-semibold">
                          +{formatRupiah(tx.profit)}
                        </td>
                      </tr>
                    ))}
                    {salesStats.combinedRealizedTx.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-400">
                          Belum ada transaksi realisasi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: POS KASIR ================= */}
        {activeTab === 'pos' && (
          <PosCashier
            products={products}
            cashierEmail={adminEmail}
            isFirestoreConnected={isFirestoreConnected}
          />
        )}

        {/* ================= TAB 3: PRODUK & HARGA (STRICT NON-DESTRUCTIVE) ================= */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Master Data Produk & Manajemen Harga
                </h2>
                <p className="text-xs text-gray-500">
                  Periksa harga modal, harga jual, kalkulator Markup/Margin, dan status aktif produk (data historis terlindungi & tidak dapat dihapus permanen).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white font-bold text-xs shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Sepatu Baru</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-pink-100 shadow-2xs flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama sepatu, SKU, atau warna..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#d65b7d]"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="Flat Shoes Klasik">Flat Shoes Klasik</option>
                  <option value="Pointed Elegant">Pointed Elegant</option>
                  <option value="Loafers & Slip-on">Loafers & Slip-on</option>
                </select>

                <select
                  value={productStatusFilter}
                  onChange={(e) => setProductStatusFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Hanya Aktif</option>
                  <option value="inactive">Nonaktif / Arsip</option>
                </select>
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProductsList.map((p) => {
                const isActive = p.isActive !== false;
                const costPrice = p.costPrice || Math.round(p.price * 0.5);
                const grossProfit = p.price - costPrice;
                const marginPct = p.price > 0 ? ((grossProfit / p.price) * 100).toFixed(1) : '0';

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-3xl p-4 border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'border-pink-100 shadow-2xs'
                        : 'border-gray-200 bg-gray-50/80 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-[#fdf2f4]">
                        <FlatshoeImage
                          src={p.imageUrl}
                          alt={p.name}
                          shoeName={p.name}
                          color={p.color}
                          category={p.category}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 text-[#be185d] border border-pink-200">
                          {p.sku || `MC-${p.id.replace('mochi-flat-', '')}`}
                        </span>

                        <span
                          className={`absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-500 text-white'
                          }`}
                        >
                          {isActive ? 'Aktif di Toko' : 'Diarsipkan (Nonaktif)'}
                        </span>
                      </div>

                      <div className="pt-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500">{p.category}</span>
                          <span className="text-[11px] font-bold text-gray-700">
                            Stok: {p.stock} pasang
                          </span>
                        </div>
                        <h4 className="font-heading font-bold text-sm text-gray-900 line-clamp-1">
                          {p.name}
                        </h4>
                        <p className="text-xs text-gray-500">{p.color}</p>

                        {/* Pricing details */}
                        <div className="p-2.5 rounded-xl bg-pink-50/50 border border-pink-100/80 space-y-1 text-xs">
                          <div className="flex justify-between text-gray-600">
                            <span>Harga Beli / Modal:</span>
                            <span className="font-mono font-semibold">{formatRupiah(costPrice)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-900">
                            <span>Harga Jual:</span>
                            <span className="font-mono text-[#be185d]">{formatRupiah(p.price)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-emerald-700 font-semibold pt-0.5 border-t border-pink-100">
                            <span>Laba Kotor / Margin:</span>
                            <span>{formatRupiah(grossProfit)} ({marginPct}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons (Non-destructive) */}
                    <div className="mt-4 pt-3 border-t border-pink-50 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(p)}
                        className="flex-1 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#be185d] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Harga & Stok</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleProductActiveStatus(p.id, !isActive)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-gray-100 hover:bg-amber-50 text-gray-600 hover:text-amber-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                        title={isActive ? 'Arsipkan produk (sembunyikan dari toko tanpa hapus data)' : 'Aktifkan kembali produk'}
                      >
                        {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 4: INVENTORY & MUTASI STOK ================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Inventory & Audit Mutasi Stok
                </h2>
                <p className="text-xs text-gray-500">
                  Jejak audit seluruh pergerakan barang (Masuk, Keluar, Penjualan, Retur, Koreksi) tanpa risiko penghapusan data.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStockModalType('IN');
                    setIsStockModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-xs hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Stok Masuk (Restock)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStockModalType('OUT');
                    setIsStockModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white border border-pink-200 text-[#be185d] font-bold text-xs hover:bg-pink-50 flex items-center gap-1 cursor-pointer"
                >
                  <span>- Stok Keluar Manual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
                  title="Buat transaksi penyesuaian koreksi tanpa mengubah data lama"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>± Koreksi Stok Audit</span>
                </button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-pink-100 shadow-2xs">
                <p className="text-xs text-gray-500">Total Varian Flatshoes</p>
                <p className="text-2xl font-bold font-heading text-gray-900 mt-1">{products.length} SKU</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-pink-100 shadow-2xs">
                <p className="text-xs text-gray-500">Total Stok Fisik Gudang</p>
                <p className="text-2xl font-bold font-heading text-[#be185d] mt-1">
                  {products.reduce((s, p) => s + p.stock, 0)} Pasang
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-pink-100 shadow-2xs">
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  Mutasi Masuk & Retur
                </p>
                <p className="text-2xl font-bold font-heading text-emerald-700 mt-1">
                  +{mutations.filter((m) => m.type === 'IN' || m.type === 'RETURN').reduce((s, m) => s + m.quantity, 0)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-pink-100 shadow-2xs">
                <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Mutasi Keluar & Penjualan
                </p>
                <p className="text-2xl font-bold font-heading text-rose-700 mt-1">
                  -{mutations.filter((m) => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0)}
                </p>
              </div>
            </div>

            {/* Mutation Log Table */}
            <div className="bg-white rounded-3xl border border-pink-100 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-heading font-bold text-sm text-gray-900">
                  Riwayat Audit Mutasi Stok Real-Time
                </h3>

                <div className="flex gap-2">
                  <select
                    value={stockMutationFilter}
                    onChange={(e) => setStockMutationFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700"
                  >
                    <option value="all">Semua Jenis Mutasi</option>
                    <option value="IN">IN (Barang Masuk / Restock)</option>
                    <option value="OUT">OUT (Penjualan / Keluar)</option>
                    <option value="RETURN">RETURN (Retur Pembatalan)</option>
                    <option value="CORRECTION">CORRECTION (Koreksi Audit)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Penyesuaian)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="pb-2.5">Waktu</th>
                      <th className="pb-2.5">Jenis</th>
                      <th className="pb-2.5">Produk Sepatu</th>
                      <th className="pb-2.5 text-center">Jumlah</th>
                      <th className="pb-2.5 text-center">Stok Awal → Akhir</th>
                      <th className="pb-2.5">Keterangan & Referensi</th>
                      <th className="pb-2.5">Petugas / Aktor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredMutations.map((m) => (
                      <tr key={m.id} className="hover:bg-pink-50/20">
                        <td className="py-3 text-gray-500 whitespace-nowrap">
                          {new Date(m.timestamp).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              m.type === 'IN'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.type === 'RETURN'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : m.type === 'CORRECTION'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-gray-900">{m.productName}</td>
                        <td className="py-3 text-center font-bold font-mono">
                          {m.type === 'OUT' ? `-${m.quantity}` : `+${m.quantity}`}
                        </td>
                        <td className="py-3 text-center text-gray-500 font-mono">
                          {m.previousStock} → <span className="font-bold text-gray-900">{m.newStock}</span>
                        </td>
                        <td className="py-3 text-gray-600">
                          <p>{m.notes}</p>
                          {m.referenceId && (
                            <span className="text-[10px] text-gray-400 font-mono">Ref: {m.referenceId}</span>
                          )}
                        </td>
                        <td className="py-3 text-gray-500">{m.actor}</td>
                      </tr>
                    ))}
                    {filteredMutations.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          Belum ada catatan mutasi stok untuk filter ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: ORDER WEBSTORE ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Data Order Webstore
                </h2>
                <p className="text-xs text-gray-500">
                  Riwayat pesanan pelanggan online dari webstore Mochi Steps.
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-pink-100 shadow-2xs flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari no. order (misal: MCS-2026), nama, HP, atau kota..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#d65b7d]"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={orderPaymentStatusFilter}
                  onChange={(e) => setOrderPaymentStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700"
                >
                  <option value="all">Status Pembayaran</option>
                  <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Ditolak">Ditolak</option>
                </select>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700"
                >
                  <option value="all">Status Pesanan</option>
                  <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                  <option value="Dibayar">Dibayar</option>
                  <option value="Diproses">Diproses</option>
                  <option value="Dikemas">Dikemas</option>
                  <option value="Dikirim">Dikirim</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                  <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-3xl border border-pink-100 p-5 shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="pb-3">No. Order</th>
                    <th className="pb-3">Tanggal</th>
                    <th className="pb-3">Pelanggan</th>
                    <th className="pb-3">Metode Bayar</th>
                    <th className="pb-3">Status Bayar</th>
                    <th className="pb-3">Status Kirim</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-pink-50/20">
                      <td className="py-3 font-mono font-bold text-gray-900">{ord.orderNumber}</td>
                      <td className="py-3 text-gray-500 whitespace-nowrap">
                        {new Date(ord.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3">
                        <p className="font-semibold text-gray-900">{ord.customerName}</p>
                        <p className="text-[11px] text-gray-400">{ord.city}</p>
                      </td>
                      <td className="py-3 text-gray-700">{ord.paymentMethod}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            ord.paymentStatus === 'Lunas'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.paymentStatus === 'Ditolak'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-block ${getOrderStatusBadgeClass(
                            ord.orderStatus
                          )}`}
                        >
                          {ord.orderStatus}
                        </span>
                        {ord.orderStatus === 'Dikirim' && ord.trackingNumber && (
                          <p className="text-[10px] text-cyan-800 font-mono mt-0.5 font-medium">
                            Resi: {ord.trackingNumber}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-[#be185d]">
                        {formatRupiah(ord.totalAmount)}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(ord)}
                            className="px-2.5 py-1 rounded-lg bg-pink-100 hover:bg-pink-200 text-[#be185d] font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-colors"
                            title="Ubah Status Pesanan"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Ubah Status</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetail(ord)}
                            className="px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-[#be185d] font-bold text-[11px] cursor-pointer"
                          >
                            Rincian
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        Tidak ada data pesanan yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 6: DATA PELANGGAN ================= */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Data Pelanggan & Riwayat Belanja
                </h2>
                <p className="text-xs text-gray-500">
                  Daftar profil pembeli terdaftar dan loyalitas transaksi.
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-3xl border border-pink-100 shadow-2xs">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama pelanggan, nomor WhatsApp, atau kota..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#d65b7d]"
                />
              </div>
            </div>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customersList
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    c.phone.includes(customerSearch) ||
                    c.city.toLowerCase().includes(customerSearch.toLowerCase())
                )
                .map((c) => (
                  <div
                    key={c.phone}
                    className="p-4 rounded-3xl bg-white border border-pink-100 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-sm text-gray-900">{c.name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-100 text-[#be185d]">
                          {c.totalOrders} Pesanan
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                        <span>WA:</span> {c.phone}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-1">{c.address}</p>
                      <p className="text-[11px] text-gray-400">{c.district}, {c.city}</p>
                      <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
                        <span className="text-gray-500">Total Belanja:</span>
                        <span className="font-bold text-[#be185d] font-mono">{formatRupiah(c.totalSpent)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCustomerDetail(c)}
                      className="w-full py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#be185d] font-bold text-xs transition-colors cursor-pointer"
                    >
                      Lihat Rincian Riwayat
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================= TAB 7: APPROVAL PEMBAYARAN ================= */}
        {activeTab === 'approval' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Verifikasi & Approval Pembayaran
                </h2>
                <p className="text-xs text-gray-500">
                  Verifikasi pesanan masuk. Approval pembayaran tidak mengurangi stok untuk kedua kalinya (stok sudah diamankan sejak checkout).
                </p>
              </div>

              <div className="flex gap-2">
                {['Menunggu Verifikasi', 'Disetujui', 'Ditolak'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setApprovalStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      approvalStatusFilter === st
                        ? 'bg-[#be185d] text-white shadow-2xs'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-pink-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Approval List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders
                .filter((o) => o.orderStatus === approvalStatusFilter)
                .map((ord) => (
                  <div
                    key={ord.id}
                    className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <span className="font-mono font-bold text-sm text-gray-900">
                          #{ord.orderNumber}
                        </span>
                        <p className="text-[11px] text-gray-500">
                          {new Date(ord.createdAt).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <span className="font-mono font-extrabold text-sm text-[#be185d]">
                        {formatRupiah(ord.totalAmount)}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-700">
                      <p><b>Pelanggan:</b> {ord.customerName} ({ord.customerPhone})</p>
                      <p><b>Metode Pembayaran:</b> {ord.paymentMethod}</p>
                      <p><b>Alamat:</b> {ord.customerAddress}, {ord.city}</p>
                      <div className="pt-2">
                        <p className="font-bold text-[11px] text-gray-500 uppercase">Item yang Dipesan:</p>
                        {ord.items.map((it, idx) => (
                          <p key={idx} className="text-[11px] text-gray-600">
                            • {it.name} (EU {it.size}) × {it.quantity} pasang
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {ord.orderStatus === 'Menunggu Verifikasi' && (
                      <div className="pt-3 border-t border-gray-100 flex gap-2">
                        <button
                          type="button"
                          onClick={() => approvePayment(ord, adminEmail)}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-105 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Tandai Lunas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt('Alasan penolakan / pembatalan pesanan (stok akan dikembalikan ke gudang):');
                            if (reason) {
                              rejectPayment(ord, reason);
                            }
                          }}
                          className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>Tolak & Kembalikan Stok</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              {orders.filter((o) => o.orderStatus === approvalStatusFilter).length === 0 && (
                <div className="p-12 text-center text-gray-400 bg-white rounded-3xl border border-pink-100 md:col-span-2">
                  Tidak ada pesanan dengan status "{approvalStatusFilter}".
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 8: LAPORAN SALES ================= */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Laporan Sales & Analitik Profitabilitas
                </h2>
                <p className="text-xs text-gray-500">
                  Laporan berbasis Firestore real-time: Menggabungkan transaksi Webstore Lunas dan POS Kasir Toko.
                </p>
              </div>

              {/* Period Filter */}
              <div className="flex bg-white rounded-2xl p-1 border border-pink-100 shadow-2xs text-xs font-bold">
                {[
                  { id: 'today', label: 'Hari Ini' },
                  { id: '7days', label: '7 Hari' },
                  { id: 'month', label: 'Bulan Ini' },
                  { id: 'all', label: 'Semua Periode' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSalesPeriod(p.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      salesPeriod === p.id
                        ? 'bg-[#be185d] text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sales Policy Callout */}
            <div className="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-200/80 text-xs text-gray-700 space-y-1">
              <p className="font-bold text-[#be185d] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Kebijakan Pengakuan Omzet & Laba Kotor:</span>
              </p>
              <p className="text-[11px] leading-relaxed text-gray-600">
                • <b>Penjualan Terealisasi:</b> Hanya pesanan online berstatus <b>Lunas</b> dan transaksi langsung <b>POS Kasir</b> yang dihitung ke dalam omzet.<br />
                • <b>Pesanan Belum Bayar / COD:</b> Tidak diakui sebagai penjualan terealisasi sampai pembayaran diverifikasi lunas.<br />
                • <b>Laba Kotor:</b> Dihitung dari selisih harga jual dan snapshot harga beli/modal pada saat transaksi dibuat (tetap akurat meski harga master produk diubah di masa depan).
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-pink-50 to-white border border-pink-200 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">Total Omzet Penjualan</p>
                <p className="text-2xl sm:text-3xl font-extrabold font-heading text-[#be185d] mt-1">
                  {formatRupiah(salesStats.totalRevenue)}
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                  {salesStats.totalTransactions} transaksi terealisasi
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">Estimasi Laba Kotor</p>
                <p className="text-2xl sm:text-3xl font-extrabold font-heading text-emerald-700 mt-1">
                  {formatRupiah(salesStats.grossProfit)}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Margin {salesStats.grossProfitMargin}% (Snapshot HPP)
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">Volume Sepatu Terjual</p>
                <p className="text-2xl sm:text-3xl font-extrabold font-heading text-gray-900 mt-1">
                  {salesStats.totalUnitsSold} Pasang
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Rata-rata order {formatRupiah(salesStats.aov)}
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs">
                <p className="text-xs text-gray-500 font-medium">Kontribusi Channel</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Webstore:</span>
                    <span className="font-bold text-gray-800">{formatRupiah(salesStats.onlineRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">POS Kasir:</span>
                    <span className="font-bold text-emerald-700">{formatRupiah(salesStats.posRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Products & Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Top Selling Products */}
              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs space-y-3">
                <h3 className="font-heading font-bold text-sm text-gray-900">
                  Produk Flatshoes Terlaris
                </h3>
                <div className="space-y-2.5">
                  {salesStats.topSellingProducts.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#fffbfc] border border-pink-100/80 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-pink-100 text-[#be185d] font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-gray-900">{p.name}</p>
                          <p className="text-[11px] text-gray-500">{p.units} pasang terjual</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[#be185d]">
                        {formatRupiah(p.revenue)}
                      </span>
                    </div>
                  ))}
                  {salesStats.topSellingProducts.length === 0 && (
                    <p className="text-xs text-gray-400 py-6 text-center">Belum ada transaksi di periode ini.</p>
                  )}
                </div>
              </div>

              {/* Sales by Category */}
              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs space-y-3">
                <h3 className="font-heading font-bold text-sm text-gray-900">
                  Penjualan Berdasarkan Kategori
                </h3>
                <div className="space-y-3 pt-1">
                  {['Flat Shoes Klasik', 'Pointed Elegant', 'Loafers & Slip-on'].map((cat) => {
                    const rev = salesStats.categoryRevenueMap.get(cat) || 0;
                    const total = salesStats.totalRevenue || 1;
                    const pct = Math.round((rev / total) * 100);

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-800">{cat}</span>
                          <span className="font-bold text-[#be185d]">
                            {formatRupiah(rev)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-pink-100 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-gradient-to-r from-[#d65b7d] to-[#be185d] rounded-full transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drilldown: Source Realized Transactions Table */}
            <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-sm text-gray-900">
                    Audit Transaksi Sumber Penjualan
                  </h3>
                  <p className="text-xs text-gray-500">
                    Daftar seluruh transaksi yang mendasari angka laporan sales (klik rincian untuk audit).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="pb-2.5">Waktu</th>
                      <th className="pb-2.5">Channel</th>
                      <th className="pb-2.5">No. Transaksi</th>
                      <th className="pb-2.5">Pelanggan</th>
                      <th className="pb-2.5 text-right">Omzet (Jual)</th>
                      <th className="pb-2.5 text-right">Modal (HPP)</th>
                      <th className="pb-2.5 text-right">Laba Kotor</th>
                      <th className="pb-2.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {salesStats.combinedRealizedTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-pink-50/20">
                        <td className="py-2.5 text-gray-500 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              tx.channel === 'POS'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-pink-50 text-[#be185d] border border-pink-200'
                            }`}
                          >
                            {tx.channel}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono font-bold text-gray-900">{tx.number}</td>
                        <td className="py-2.5 text-gray-700">{tx.customer}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-[#be185d]">
                          {formatRupiah(tx.total)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-gray-500">
                          {formatRupiah(tx.cost)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-emerald-700 font-bold">
                          +{formatRupiah(tx.profit)}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedSourceTx(tx)}
                            className="px-2 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-[#be185d] font-bold text-[10px] cursor-pointer"
                          >
                            Rincian
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ================= MODAL: EDIT PRODUCT WITH CALCULATOR ================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 space-y-4">
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 text-[#be185d] flex items-center justify-center">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900">
                  Edit Sepatu & Perhitungan Harga
                </h3>
                <p className="text-xs text-gray-500">SKU: {editingProduct.sku || editingProduct.id}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nama Produk:</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 focus:outline-none focus:ring-1 focus:ring-[#d65b7d]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Kategori:</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200"
                  >
                    <option value="Flat Shoes Klasik">Flat Shoes Klasik</option>
                    <option value="Pointed Elegant">Pointed Elegant</option>
                    <option value="Loafers & Slip-on">Loafers & Slip-on</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Harga Beli / Modal (Rp):</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editingProduct.costPrice || 80000}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Harga Jual (Rp):</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-mono font-bold text-[#be185d]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Stok Fisik:</label>
                  <input
                    type="number"
                    min={0}
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-bold"
                  />
                </div>
              </div>

              {/* Integrated Markup / Margin Calculator */}
              <ProductPricingCalculator
                costPrice={editingProduct.costPrice || 80000}
                onApplyPrice={(calcPrice) => {
                  setEditingProduct({ ...editingProduct, price: calcPrice });
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Warna Sepatu:</label>
                  <input
                    type="text"
                    value={editingProduct.color}
                    onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Status Produk:</label>
                  <select
                    value={editingProduct.isActive !== false ? 'true' : 'false'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.value === 'true' })}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200"
                  >
                    <option value="true">Aktif (Tampil di Toko & POS)</option>
                    <option value="false">Nonaktif / Arsip (Disembunyikan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Deskripsi:</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200"
                />
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white font-bold shadow-2xs hover:brightness-105 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TAMBAH PRODUK BARU WITH CALCULATOR ================= */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 space-y-4">
            <button
              type="button"
              onClick={() => setIsNewProductModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 text-[#be185d] flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900">
                  Tambah Produk Sepatu Baru
                </h3>
                <p className="text-xs text-gray-500">Tambahkan koleksi flatshoes baru ke database Mochi Steps.</p>
              </div>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nama Sepatu *:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Blossom Pointed Velvet"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Kategori *:</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200"
                  >
                    <option value="Flat Shoes Klasik">Flat Shoes Klasik</option>
                    <option value="Pointed Elegant">Pointed Elegant</option>
                    <option value="Loafers & Slip-on">Loafers & Slip-on</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Harga Beli / Modal (Rp) *:</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={newProdCostPrice}
                    onChange={(e) => setNewProdCostPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Harga Jual (Rp) *:</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-mono font-bold text-[#be185d]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Stok Awal:</label>
                  <input
                    type="number"
                    min={0}
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-bold"
                  />
                </div>
              </div>

              {/* Calculator in Add Product modal */}
              <ProductPricingCalculator
                costPrice={newProdCostPrice}
                onApplyPrice={(calcPrice) => {
                  setNewProdPrice(calcPrice);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Warna Sepatu:</label>
                  <input
                    type="text"
                    value={newProdColor}
                    onChange={(e) => setNewProdColor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Kode SKU:</label>
                  <input
                    type="text"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Deskripsi:</label>
                <textarea
                  rows={2}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200"
                />
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white font-bold shadow-2xs hover:brightness-105 cursor-pointer"
                >
                  + Tambahkan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: STOK MASUK / KELUAR ================= */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 space-y-4">
            <button
              type="button"
              onClick={() => setIsStockModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-bold text-lg text-gray-900">
              {stockModalType === 'IN' ? '+ Catat Stok Masuk (Restock)' : '- Catat Stok Keluar Manual'}
            </h3>

            <form onSubmit={handleRecordMutation} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Pilih Produk Sepatu:</label>
                <select
                  value={stockModalProductId}
                  onChange={(e) => setStockModalProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok Saat Ini: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Jumlah Pasang:</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={stockModalQty}
                  onChange={(e) => setStockModalQty(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Keterangan / Catatan Alasan:</label>
                <input
                  type="text"
                  placeholder="Misal: Restock Batch 3 dari Pengrajin, Afkir, Retur, dll."
                  value={stockModalNotes}
                  onChange={(e) => setStockModalNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-bold cursor-pointer ${
                    stockModalType === 'IN'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                      : 'bg-gradient-to-r from-rose-600 to-pink-600'
                  }`}
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KOREKSI STOK AUDIT (NON-DESTRUCTIVE) ================= */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 space-y-4">
            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-gray-900">
                  Transaksi Koreksi Stok Audit
                </h3>
                <p className="text-[11px] text-gray-500">Mencatat mutasi penyeimbang dengan jejak referensi.</p>
              </div>
            </div>

            <form onSubmit={handleRecordCorrection} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Produk yang Dikoreksi:</label>
                <select
                  value={correctionProductId}
                  onChange={(e) => setCorrectionProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok Saat Ini: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Penyesuaian Selisih Pasang (+ untuk tambah, - untuk kurang):
                </label>
                <input
                  type="number"
                  step={1}
                  required
                  value={correctionDelta}
                  onChange={(e) => setCorrectionDelta(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200 font-bold font-mono text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Contoh: ketik 2 untuk menambah 2 pasang, atau -2 untuk mengurangi 2 pasang akibat salah hitung.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Alasan & Dasar Koreksi * (Wajib untuk Audit):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Selisih opname fisik vs sistem per 14 Oktober"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                >
                  Simpan Transaksi Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETAIL ORDER ================= */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 sm:p-7 space-y-4">
            <button
              type="button"
              onClick={() => setSelectedOrderDetail(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 text-[#be185d] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900">
                  Rincian Order #{selectedOrderDetail.orderNumber}
                </h3>
                <p className="text-xs text-gray-500">
                  {new Date(selectedOrderDetail.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#fff4f7] border border-pink-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Status Pembayaran:</span>
                <span className="font-bold text-[#be185d]">{selectedOrderDetail.paymentStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status Pengiriman:</span>
                <span className="font-bold text-gray-900">{selectedOrderDetail.orderStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Metode Bayar:</span>
                <span className="font-semibold text-gray-800">{selectedOrderDetail.paymentMethod}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-gray-700">
              <p className="font-bold text-gray-900">Alamat Tujuan:</p>
              <p><b>Penerima:</b> {selectedOrderDetail.customerName} ({selectedOrderDetail.customerPhone})</p>
              <p><b>Alamat:</b> {selectedOrderDetail.customerAddress}</p>
              <p><b>Kecamatan/Kota:</b> {selectedOrderDetail.district}, {selectedOrderDetail.city} ({selectedOrderDetail.postalCode})</p>
              <p><b>Kurir:</b> {selectedOrderDetail.courier}</p>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-3">
              <p className="font-bold text-xs text-gray-900">Item Pesanan:</p>
              {selectedOrderDetail.items.map((it, idx) => (
                <div key={idx} className="flex justify-between p-2 rounded-xl bg-gray-50 text-xs">
                  <div>
                    <p className="font-bold text-gray-800">{it.name}</p>
                    <p className="text-[11px] text-gray-500">Ukuran: EU {it.size} • {it.quantity} pasang</p>
                  </div>
                  <span className="font-mono font-bold text-gray-900">{formatRupiah(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-between items-baseline">
              <span className="font-bold text-sm text-gray-900">Total Tagihan:</span>
              <span className="font-mono font-extrabold text-lg text-[#be185d]">
                {formatRupiah(selectedOrderDetail.totalAmount)}
              </span>
            </div>

            {/* Quick status progression */}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
              {selectedOrderDetail.orderStatus === 'Disetujui' && (
                <button
                  type="button"
                  onClick={async () => {
                    await updateOrderStatus(selectedOrderDetail.id, 'Dikirim');
                    setSelectedOrderDetail(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white font-bold text-xs cursor-pointer"
                >
                  Tandai Sedang Dikirim
                </button>
              )}
              {selectedOrderDetail.orderStatus === 'Dikirim' && (
                <button
                  type="button"
                  onClick={async () => {
                    await updateOrderStatus(selectedOrderDetail.id, 'Selesai');
                    setSelectedOrderDetail(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                >
                  Tandai Pesanan Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETAIL TRANSAKSI SUMBER LAPORAN ================= */}
      {selectedSourceTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 space-y-4">
            <button
              type="button"
              onClick={() => setSelectedSourceTx(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-100 text-[#be185d]">
                Channel: {selectedSourceTx.channel}
              </span>
              <h3 className="font-heading font-bold text-base text-gray-900 mt-1">
                Bukti Audit #{selectedSourceTx.number}
              </h3>
              <p className="text-xs text-gray-500">
                {new Date(selectedSourceTx.date).toLocaleString('id-ID')}
              </p>
            </div>

            <div className="space-y-1 text-xs border-y border-gray-100 py-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Pelanggan:</span>
                <span className="font-bold text-gray-900">{selectedSourceTx.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Omzet:</span>
                <span className="font-mono font-bold text-[#be185d]">{formatRupiah(selectedSourceTx.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Harga Modal (HPP):</span>
                <span className="font-mono text-gray-700">{formatRupiah(selectedSourceTx.cost)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Laba Kotor:</span>
                <span className="font-mono">+{formatRupiah(selectedSourceTx.profit)}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-bold text-gray-900">Rincian Item:</p>
              {selectedSourceTx.items.map((it: any, i: number) => (
                <div key={i} className="flex justify-between text-[11px] text-gray-600">
                  <span>{it.name} (EU {it.size}) × {it.quantity}</span>
                  <span className="font-mono">{formatRupiah((it.price || 0) * (it.quantity || 1))}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedSourceTx(null)}
              className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETAIL PELANGGAN ================= */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedCustomerDetail(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-bold text-lg text-gray-900">
              Riwayat Belanja {selectedCustomerDetail.name}
            </h3>
            <p className="text-xs text-gray-500">WA: {selectedCustomerDetail.phone}</p>

            <div className="space-y-2 border-t border-gray-100 pt-3">
              <p className="font-bold text-xs text-gray-900">Pesanan Milik Pelanggan ({selectedCustomerDetail.orders.length}):</p>
              {selectedCustomerDetail.orders.map((ord) => (
                <div key={ord.id} className="p-3 rounded-2xl bg-gray-50 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>#{ord.orderNumber}</span>
                    <span className="text-[#be185d] font-mono">{formatRupiah(ord.totalAmount)}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {new Date(ord.createdAt).toLocaleDateString('id-ID')} • {ord.paymentStatus} • {ord.orderStatus}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedCustomerDetail(null)}
              className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: UBAH STATUS PESANAN ================= */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 space-y-4">
            <button
              type="button"
              disabled={isSavingStatus}
              onClick={() => setStatusModalOrder(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-pink-100 text-[#be185d]">
                  <Edit2 className="w-4 h-4" />
                </span>
                <h3 className="font-heading font-bold text-lg text-gray-900">
                  Ubah Status Pesanan
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Perbarui status pesanan <span className="font-mono font-bold text-gray-800">#{statusModalOrder.orderNumber}</span> ({statusModalOrder.customerName}).
              </p>
            </div>

            {/* Status Saat Ini */}
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Status Saat Ini:</span>
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${getOrderStatusBadgeClass(statusModalOrder.orderStatus)}`}>
                {statusModalOrder.orderStatus}
              </span>
            </div>

            {/* Pilihan Status Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Pilih Status Pesanan:
              </label>
              <select
                value={newSelectedStatus}
                onChange={(e) => {
                  const val = e.target.value as OrderStatus;
                  setNewSelectedStatus(val);
                  if (val !== 'Dibatalkan') {
                    setIsCancellationConfirmed(false);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d65b7d] cursor-pointer shadow-2xs"
              >
                <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                <option value="Dibayar">Dibayar</option>
                <option value="Diproses">Diproses</option>
                <option value="Dikemas">Dikemas</option>
                <option value="Dikirim">Dikirim</option>
                <option value="Selesai">Selesai</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>

            {/* Jika Status Dikirim: Sediakan field untuk nomor resi */}
            {newSelectedStatus === 'Dikirim' && (
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200">
                <label className="text-xs font-bold text-cyan-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-cyan-700" />
                    <span>Nomor Resi Pengiriman:</span>
                  </span>
                  <span className="text-[10px] text-cyan-700 font-semibold">{statusModalOrder.courier || 'Ekspedisi'}</span>
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nomor resi (cth: JNE-982348274, JP8972134...)"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-cyan-300 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-[10px] text-cyan-700">
                  Nomor resi ini akan tersimpan ke database dan dapat dicek langsung oleh pembeli pada fitur Lacak Pesanan.
                </p>
              </div>
            )}

            {/* Jika Status Selesai: Tandai sebagai pesanan yang sudah selesai */}
            {newSelectedStatus === 'Selesai' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-900">Pesanan Ditandai Selesai</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                    Pesanan ini ditandai sebagai pesanan yang sudah selesai diterima pelanggan, dan status pembayaran otomatis menjadi Lunas.
                  </p>
                </div>
              </div>
            )}

            {/* Jika Status Dibatalkan: Minta konfirmasi terlebih dahulu sebelum menyimpan */}
            {newSelectedStatus === 'Dibatalkan' && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-rose-900">Konfirmasi Pembatalan Pesanan</p>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                      Apakah Anda yakin ingin membatalkan pesanan ini? Stok pesanan akan otomatis direstorasi ke inventaris produk secara atomik.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 pt-2 border-t border-rose-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCancellationConfirmed}
                    onChange={(e) => setIsCancellationConfirmed(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-rose-900">
                    Saya mengonfirmasi pembatalan pesanan ini
                  </span>
                </label>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isSavingStatus}
                onClick={() => setStatusModalOrder(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingStatus || (newSelectedStatus === 'Dibatalkan' && !isCancellationConfirmed)}
                onClick={handleSaveStatusChange}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                  newSelectedStatus === 'Dibatalkan' && !isCancellationConfirmed
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-gradient-to-r from-[#d65b7d] to-[#be185d] hover:brightness-105'
                }`}
              >
                {isSavingStatus ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gray-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl text-xs font-semibold animate-fade-in border border-gray-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
