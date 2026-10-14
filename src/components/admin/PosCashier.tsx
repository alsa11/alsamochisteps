import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Footprints,
  User,
  Phone,
  Tag,
  Receipt,
} from 'lucide-react';
import { Product, PosItem, PosTransaction, PosPaymentMethod } from '../../types';
import { processPosTransaction } from '../../lib/firestoreService';
import { FlatshoeImage } from '../FlatshoeImage';
import { PosReceiptModal } from './PosReceiptModal';

interface PosCashierProps {
  products: Product[];
  cashierEmail: string;
  isFirestoreConnected: boolean;
}

export const PosCashier: React.FC<PosCashierProps> = ({
  products,
  cashierEmail,
  isFirestoreConnected,
}) => {
  // Search and Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cashier Cart & Selected Product Variants
  const [cart, setCart] = useState<PosItem[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({});

  // Customer & Payment State
  const [customerName, setCustomerName] = useState('Pelanggan Walk-in');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('Tunai');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedTransaction, setCompletedTransaction] = useState<PosTransaction | null>(null);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Only show active products for sale in POS
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.isActive !== false);
  }, [products]);

  // Filtered products by search & category
  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.color.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeProducts, selectedCategory, searchQuery]);

  // Cart calculations
  const totalItems = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.quantity, 0);
  }, [cart]);

  const totalAmount = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.subtotal, 0);
  }, [cart]);

  const totalCost = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.costPrice * it.quantity, 0);
  }, [cart]);

  const grossProfit = totalAmount - totalCost;

  // Change calculation for cash payment
  const changeGiven = paymentMethod === 'Tunai' ? Math.max(0, cashTendered - totalAmount) : 0;
  const isCashSufficient = paymentMethod !== 'Tunai' || cashTendered >= totalAmount;

  // Handle setting size for a product
  const handleSizeSelect = (productId: string, size: number) => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: size }));
  };

  // Add item to cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      setErrorMessage(`Stok untuk "${product.name}" saat ini habis.`);
      return;
    }

    const chosenSize = selectedSizes[product.id] || product.sizes[0] || 38;

    // Check quantity in cart
    const existingIdx = cart.findIndex(
      (it) => it.productId === product.id && it.size === chosenSize
    );

    if (existingIdx > -1) {
      const currentCartQty = cart[existingIdx].quantity;
      if (currentCartQty >= product.stock) {
        setErrorMessage(`Stok tersedia "${product.name}" hanya ${product.stock} pasang.`);
        return;
      }

      setCart((prev) => {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + 1;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          subtotal: newQty * product.price,
        };
        return updated;
      });
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          category: product.category,
          size: chosenSize,
          quantity: 1,
          costPrice: product.costPrice || Math.round(product.price * 0.5),
          price: product.price,
          subtotal: product.price,
          imageUrl: product.imageUrl,
        },
      ]);
    }

    setErrorMessage(null);
  };

  // Update quantity in cart
  const handleUpdateQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const item = prev[idx];
      const product = products.find((p) => p.id === item.productId);
      const maxStock = product ? product.stock : 999;
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      if (newQty > maxStock) {
        setErrorMessage(`Stok maksimal "${item.name}" adalah ${maxStock} pasang.`);
        return prev;
      }

      const updated = [...prev];
      updated[idx] = {
        ...item,
        quantity: newQty,
        subtotal: newQty * item.price,
      };
      return updated;
    });
    setErrorMessage(null);
  };

  // Remove from cart
  const handleRemoveFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick cash chips
  const handleSetQuickCash = (nominal: number) => {
    setCashTendered(nominal);
  };

  // Process checkout
  const handleProcessCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage('Keranjang kasir masih kosong. Silakan pilih sepatu terlebih dahulu.');
      return;
    }

    if (paymentMethod === 'Tunai' && cashTendered < totalAmount) {
      setErrorMessage(`Uang tunai kurang sebesar ${formatRupiah(totalAmount - cashTendered)}.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const posNumber = `POS-${dateStr}-${randomSuffix}`;

      const posData: Omit<PosTransaction, 'id' | 'createdAt'> = {
        posNumber,
        cashierName: cashierEmail.split('@')[0] || 'Kasir Mochi',
        customerName: customerName.trim() || 'Pelanggan Walk-in',
        customerPhone: customerPhone.trim() || undefined,
        items: cart,
        totalItems,
        totalAmount,
        totalCost,
        grossProfit,
        paymentMethod,
        cashTendered: paymentMethod === 'Tunai' ? cashTendered : totalAmount,
        changeGiven: paymentMethod === 'Tunai' ? changeGiven : 0,
        notes: notes.trim() || undefined,
      };

      const txId = await processPosTransaction(posData);

      const completeTx: PosTransaction = {
        ...posData,
        id: txId,
        createdAt: new Date().toISOString(),
      };

      setCompletedTransaction(completeTx);
    } catch (err: any) {
      console.error('POS checkout error:', err);
      setErrorMessage(err.message || 'Gagal memproses transaksi kasir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for new transaction
  const handleNewTransaction = () => {
    setCart([]);
    setCustomerName('Pelanggan Walk-in');
    setCustomerPhone('');
    setPaymentMethod('Tunai');
    setCashTendered(0);
    setNotes('');
    setCompletedTransaction(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 flex items-center gap-2">
            <span>POS Kasir Toko Mochi Steps</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 text-[#be185d] font-bold">
              Real-time In-Store
            </span>
          </h2>
          <p className="text-xs text-gray-500">
            Transaksi penjualan offline dengan pencatatan otomatis mutasi stok, hitung kembalian cepat, dan cetak struk belanja.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 font-medium">Kasir Aktif:</span>
          <span className="font-bold text-gray-800 bg-white px-3 py-1.5 rounded-xl border border-pink-100 shadow-2xs">
            {cashierEmail}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* POS Grid: Left Catalog, Right Cashier Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT SECTION: CATALOG & SEARCH (8 Cols) ================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Search & Category Filter Toolbar */}
          <div className="bg-white p-4 rounded-3xl border border-pink-100/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari sepatu, kode SKU (mis: MC-01), warna, atau model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#faf7f8] border border-pink-100 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d65b7d]/30"
                />
              </div>

              {/* Category Filter Buttons */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'Semua Koleksi' },
                  { id: 'Flat Shoes Klasik', label: 'Klasik' },
                  { id: 'Pointed Elegant', label: 'Pointed' },
                  { id: 'Loafers & Slip-on', label: 'Loafer' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#be185d] text-white shadow-xs'
                        : 'bg-gray-100 hover:bg-pink-50 text-gray-600 hover:text-[#be185d]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredProducts.map((p) => {
              const currentSize = selectedSizes[p.id] || p.sizes[0] || 38;
              const isOutOfStock = p.stock <= 0;

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-3xl p-3.5 border transition-all flex flex-col justify-between ${
                    isOutOfStock
                      ? 'opacity-60 border-gray-200'
                      : 'border-pink-100/90 hover:border-pink-300 hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Image & Badges */}
                    <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-[#fdf2f4]">
                      <FlatshoeImage
                        src={p.imageUrl}
                        alt={p.name}
                        shoeName={p.name}
                        color={p.color}
                        category={p.category}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/95 text-[#be185d] border border-pink-200">
                        {p.sku || `MC-${p.id.replace('mochi-flat-', '')}`}
                      </span>

                      <span
                        className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isOutOfStock
                            ? 'bg-red-500 text-white'
                            : p.stock <= 5
                            ? 'bg-amber-500 text-white'
                            : 'bg-black/60 text-white backdrop-blur-xs'
                        }`}
                      >
                        {isOutOfStock ? 'Stok Habis' : `Stok: ${p.stock}`}
                      </span>
                    </div>

                    {/* Details */}
                    <div>
                      <h4 className="font-heading font-bold text-xs text-gray-900 line-clamp-1">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{p.color}</p>
                      <p className="font-heading font-extrabold text-sm text-[#be185d] pt-1">
                        {formatRupiah(p.price)}
                      </p>
                    </div>

                    {/* Size Selector */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <span>Pilih Ukuran:</span>
                        <span className="font-bold text-gray-800">EU {currentSize}</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {p.sizes.map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => handleSizeSelect(p.id, sz)}
                            className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              currentSize === sz
                                ? 'bg-[#be185d] text-white'
                                : 'bg-gray-100 hover:bg-pink-100 text-gray-700'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Add to POS Cart Button */}
                  <div className="pt-3 mt-2 border-t border-pink-50">
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleAddToCart(p)}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isOutOfStock
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white hover:brightness-105 shadow-2xs'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Masukkan Kasir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= RIGHT SECTION: CASHIER CART & TENDER (4-5 Cols) ================= */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-pink-100/90 shadow-sm p-4 sm:p-5 space-y-4 sticky top-6">
          
          <div className="flex items-center justify-between border-b border-pink-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-100 text-[#be185d] flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h3 className="font-heading font-bold text-base text-gray-900">
                Keranjang Kasir
              </h3>
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
              {totalItems} Pasang
            </span>
          </div>

          {/* Cart Item List */}
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-gray-400 space-y-2">
                <Footprints className="w-8 h-8 mx-auto text-pink-200" />
                <p className="text-xs">Belum ada item dipilih.</p>
                <p className="text-[11px] text-gray-400">Pilih sepatu dari katalog di sebelah kiri.</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={`${item.productId}-${item.size}`}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#fdf8f9] border border-pink-100/60 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-500">
                      Size: <span className="font-semibold text-gray-800">EU {item.size}</span> • {formatRupiah(item.price)}
                    </p>
                    <p className="font-extrabold text-[#be185d] text-xs pt-0.5">
                      {formatRupiah(item.subtotal)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(idx, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-200 hover:bg-pink-100 flex items-center justify-center text-gray-600 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs text-gray-800">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(idx, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-200 hover:bg-pink-100 flex items-center justify-center text-gray-600 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(idx)}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-1 cursor-pointer"
                      title="Hapus item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer Input (Optional for Walk-in) */}
          <div className="pt-2 border-t border-pink-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nama Pelanggan (opsional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#d65b7d]"
                />
              </div>
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="No. HP / WA (opsional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#d65b7d]"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-gray-700">Metode Pembayaran:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'Tunai', icon: Banknote, label: 'Tunai' },
                { id: 'QRIS', icon: QrCode, label: 'QRIS' },
                { id: 'Debit/Kredit', icon: CreditCard, label: 'Debit' },
                { id: 'Transfer Bank', icon: Receipt, label: 'Transfer' },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      active
                        ? 'bg-[#be185d] text-white shadow-2xs'
                        : 'bg-gray-100 hover:bg-pink-50 text-gray-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tender & Quick Nominals */}
          {paymentMethod === 'Tunai' && (
            <div className="space-y-2 p-3 rounded-2xl bg-pink-50/50 border border-pink-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">Uang Tunai Diterima:</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={cashTendered || ''}
                  onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                  placeholder="Rp 0"
                  className="w-36 text-right font-mono font-bold text-xs px-2.5 py-1.5 rounded-xl bg-white border border-pink-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#be185d]"
                />
              </div>

              {/* Quick Nominal Buttons */}
              <div className="flex flex-wrap gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleSetQuickCash(totalAmount)}
                  className="px-2 py-1 rounded-lg bg-white border border-pink-200 text-[10px] font-bold text-[#be185d] hover:bg-pink-100 transition-colors cursor-pointer"
                >
                  Uang Pas
                </button>
                {[150000, 200000, 300000, 500000].map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => handleSetQuickCash(nom)}
                    className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {formatRupiah(nom)}
                  </button>
                ))}
              </div>

              {/* Kembalian Display */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-pink-100">
                <span className="text-gray-600">Kembalian:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    cashTendered < totalAmount && totalAmount > 0
                      ? 'text-red-500'
                      : 'text-emerald-700'
                  }`}
                >
                  {cashTendered < totalAmount && totalAmount > 0
                    ? `Kurang ${formatRupiah(totalAmount - cashTendered)}`
                    : formatRupiah(changeGiven)}
                </span>
              </div>
            </div>
          )}

          {/* Transaction Summary */}
          <div className="space-y-1 pt-2 border-t border-pink-100 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal Penjualan</span>
              <span className="font-mono">{formatRupiah(totalAmount)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-heading font-bold text-sm text-gray-900">Total Transaksi</span>
              <span className="font-heading font-extrabold text-lg text-[#be185d]">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            disabled={isSubmitting || cart.length === 0 || !isCashSufficient}
            onClick={handleProcessCheckout}
            className={`w-full py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
              isSubmitting || cart.length === 0 || !isCashSufficient
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white hover:brightness-105 shadow-pink-200'
            }`}
          >
            {isSubmitting ? (
              <span>Memproses & Menyimpan Transaksi...</span>
            ) : (
              <>
                <Receipt className="w-4 h-4" />
                <span>Selesaikan Transaksi & Cetak Struk</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* POS Receipt Modal */}
      {completedTransaction && (
        <PosReceiptModal
          transaction={completedTransaction}
          onClose={() => setCompletedTransaction(null)}
          onNewTransaction={handleNewTransaction}
        />
      )}
    </div>
  );
};
