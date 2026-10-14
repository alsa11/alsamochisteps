export interface Product {
  id: string;
  name: string;
  category: 'Flat Shoes Klasik' | 'Pointed Elegant' | 'Loafers & Slip-on';
  costPrice: number; // Harga Beli / Modal
  price: number;     // Harga Jual
  stock: number;
  sizes: number[];
  description: string;
  imageUrl: string;
  color: string;
  badge?: string;
  rating: number;
  reviewCount: number;
  material: string;
  heelHeight: string;
  sku?: string;
  isActive: boolean; // Soft-delete / status aktif (data tidak boleh dihapus permanen)
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  selectedSize: number;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  costPrice?: number; // Snapshot harga modal saat transaksi
  price: number;      // Snapshot harga jual saat transaksi
  size: number;
  quantity: number;
  imageUrl: string;
  color: string;
}

export type PaymentMethod = 
  | 'QRIS'
  | 'BCA Virtual Account'
  | 'Mandiri Virtual Account'
  | 'BRI Virtual Account (BRIVA)'
  | 'BNI Virtual Account'
  | 'Permata Virtual Account'
  | 'CIMB Niaga Virtual Account'
  | 'BSI Virtual Account'
  | 'Bank Transfer BCA'
  | 'Bank Transfer Mandiri'
  | 'Bank Transfer BRI'
  | 'Bank Transfer BNI'
  | 'COD'
  | string;

export type PaymentStatus = 
  | 'Menunggu Pembayaran'
  | 'Lunas'
  | 'Ditolak';

export type OrderStatus = 
  | 'Menunggu Pembayaran'
  | 'Dibayar'
  | 'Diproses'
  | 'Dikemas'
  | 'Dikirim'
  | 'Selesai'
  | 'Dibatalkan'
  | 'Menunggu Verifikasi'
  | 'Disetujui'
  | 'Ditolak'
  | string;

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district: string;
  subdistrict?: string;
  city: string;
  province?: string;
  postalCode: string;
  landmark?: string;
  specialNotes?: string;
  courier: string;
  trackingNumber?: string; // Nomor resi pengiriman
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export type StockMutationType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'CORRECTION' | 'RETURN';

export interface StockMutation {
  id: string;
  productId: string;
  productName: string;
  type: StockMutationType;
  quantity: number;
  notes: string;
  previousStock: number;
  newStock: number;
  timestamp: string;
  actor: string;
  referenceId?: string; // ID transaksi asal (Order / POS / Mutasi Asal)
  correctionOf?: string;
}

export interface CustomerSummary {
  phone: string;
  name: string;
  address: string;
  district: string;
  city: string;
  postalCode: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  isActive?: boolean;
  orders: Order[];
}

export interface PosItem {
  productId: string;
  name: string;
  category: string;
  size: number;
  quantity: number;
  costPrice: number; // Snapshot harga modal
  price: number;     // Snapshot harga jual
  subtotal: number;
  imageUrl?: string;
}

export type PosPaymentMethod = 'Tunai' | 'QRIS' | 'Debit/Kredit' | 'Transfer Bank' | string;

export interface PosTransaction {
  id: string;
  posNumber: string;
  cashierName: string;
  customerName: string;
  customerPhone?: string;
  items: PosItem[];
  totalItems: number;
  totalAmount: number;
  totalCost: number;
  grossProfit: number;
  paymentMethod: PosPaymentMethod;
  cashTendered: number;
  changeGiven: number;
  notes?: string;
  createdAt: string;
}
