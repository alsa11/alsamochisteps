import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  Product,
  Order,
  StockMutation,
  OrderStatus,
  PaymentStatus,
  PosTransaction,
} from '../types';

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: 'Mochi Peach Puff Ribbon',
    category: 'Flat Shoes Klasik',
    costPrice: 78000,
    price: 159000,
    stock: 24,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Flatshoes klasik bernuansa peach manis dengan pita ganda empuk dan bantalan CloudMochi 8mm selembut marshmallow. Ringan dan menggemaskan untuk hangout.',
    imageUrl: '/shoes/mochi-flat-01.jpg',
    color: 'Pastel Peach Puff',
    badge: 'Best Seller',
    rating: 4.9,
    reviewCount: 142,
    material: 'Microfiber Velvet Leather + Mochi Cushion 8mm',
    heelHeight: '1 cm Flat',
    sku: 'MC-01',
    isActive: true,
  },
  {
    name: 'Daisy Cloud Butter Flats',
    category: 'Flat Shoes Klasik',
    costPrice: 70000,
    price: 139000,
    stock: 20,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Flatshoes warna butter cream lembut dengan hiasan bunga daisy manis di ujung sepatu. Dilapisi busa tumit anti-lecet yang ekstra empuk.',
    imageUrl: '/shoes/mochi-flat-02.jpg',
    color: 'Vanilla Butter & Daisy',
    badge: 'Super Lucu',
    rating: 4.8,
    reviewCount: 98,
    material: 'Ultra-soft Matte Vegan Leather',
    heelHeight: '1 cm Flat',
    sku: 'MC-02',
    isActive: true,
  },
  {
    name: 'Strawberry Pearl Mary Jane',
    category: 'Flat Shoes Klasik',
    costPrice: 84000,
    price: 169000,
    stock: 18,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Model Mary Jane manis warna susu stroberi dengan strap mutiara berkilau dan insole empuk berkontur. Bikin langkah kaki tampak imut dan feminin.',
    imageUrl: '/shoes/mochi-flat-03.jpg',
    color: 'Strawberry Milk Pink',
    badge: 'Favorit Harian',
    rating: 4.9,
    reviewCount: 112,
    material: 'Quilted Lambskin Faux Leather',
    heelHeight: '1.2 cm Flat',
    sku: 'MC-03',
    isActive: true,
  },
  {
    name: 'Caramel Bear Cloud Ballerina',
    category: 'Flat Shoes Klasik',
    costPrice: 88000,
    price: 179000,
    stock: 15,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Nuansa caramel nude hangat dengan detail aksen siluet teddy bear imut. Cushion ganda busa mochi meredam capek berdiri seharian.',
    imageUrl: '/shoes/mochi-flat-04.jpg',
    color: 'Caramel Teddy Nude',
    badge: 'Signature Mochi',
    rating: 5.0,
    reviewCount: 86,
    material: 'Premium Vegan Nubuck + Dual Insole Cushion',
    heelHeight: '1 cm Flat',
    sku: 'MC-04',
    isActive: true,
  },
  {
    name: 'Sakura Blossom Pointed',
    category: 'Pointed Elegant',
    costPrice: 96000,
    price: 199000,
    stock: 22,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Ujung pointed meruncing anggun berhias bros kelopak sakura kristal. Potongan ergonomis membuat jari kaki tetap leluasa tanpa terjepit.',
    imageUrl: '/shoes/mochi-flat-05.jpg',
    color: 'Sakura Petal Pink',
    badge: 'New Arrival',
    rating: 4.9,
    reviewCount: 64,
    material: 'Soft Supple PU Leather',
    heelHeight: '1.5 cm Low Flat',
    sku: 'MC-05',
    isActive: true,
  },
  {
    name: 'Lilac Fairy Star Pointed',
    category: 'Pointed Elegant',
    costPrice: 105000,
    price: 219000,
    stock: 16,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Warna pastel lilac berkilau lembut dengan buckle bintang kristal bak negeri dongeng. Bahan vegan microfiber halus dan tahan cipratan air.',
    imageUrl: '/shoes/mochi-flat-06.jpg',
    color: 'Dreamy Lilac Mist',
    badge: 'Limited Edition',
    rating: 4.8,
    reviewCount: 52,
    material: 'Smooth Microfiber Soft Finish',
    heelHeight: '1.5 cm Low Flat',
    sku: 'MC-06',
    isActive: true,
  },
  {
    name: 'Boba Pearl Milk Tea Pointed',
    category: 'Pointed Elegant',
    costPrice: 112000,
    price: 239000,
    stock: 14,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Warna krem teh susu kekinian dengan deretan mutiara manis berjejer di vamp. Cocok untuk ngantor formal maupun hangout santai.',
    imageUrl: '/shoes/mochi-flat-07.jpg',
    color: 'Milk Tea Cream',
    badge: 'Elegan & Gemas',
    rating: 5.0,
    reviewCount: 78,
    material: 'Silk Sheen Satin Leather + Latex Pad',
    heelHeight: '1.5 cm Low Flat',
    sku: 'MC-07',
    isActive: true,
  },
  {
    name: 'Matcha Sweet Pistachio Pointed',
    category: 'Pointed Elegant',
    costPrice: 92000,
    price: 189000,
    stock: 19,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Nuansa hijau matcha pastel segar dengan aksen buckle daun emas mini. Outsole karet fleksibel bisa ditekuk 180 derajat tanpa retak.',
    imageUrl: '/shoes/mochi-flat-08.jpg',
    color: 'Pastel Matcha Mint',
    badge: 'Warna Pastel Unik',
    rating: 4.7,
    reviewCount: 91,
    material: 'Flexible Vegan Calfskin',
    heelHeight: '1 cm Flat',
    sku: 'MC-08',
    isActive: true,
  },
  {
    name: 'Choco Marshmallow Penny Loafers',
    category: 'Loafers & Slip-on',
    costPrice: 118000,
    price: 249000,
    stock: 25,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Loafer kulit cokelat susu klasik dengan bantalan CloudMochi selembut marshmallow. Desain penny loafer timeless yang super empuk dan nyaman seharian.',
    imageUrl: '/shoes/mochi-flat-09.jpg',
    color: 'Milk Chocolate & Marshmallow Cushion',
    badge: 'Paling Empuk',
    rating: 4.9,
    reviewCount: 134,
    material: 'Buttery Soft Nappa PU + Cloud Cushion',
    heelHeight: '1.5 cm Flat',
    sku: 'MC-09',
    isActive: true,
  },
  {
    name: 'Vanilla Cream Bow Loafers',
    category: 'Loafers & Slip-on',
    costPrice: 108000,
    price: 229000,
    stock: 17,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Slip-on flat loafer warna krim vanilla manis dengan aksen simpul pita kulit manis di bagian depan. Bantalan tumit anti-lecet bertekstur empuk.',
    imageUrl: '/shoes/mochi-flat-10.jpg',
    color: 'Warm Vanilla Cream & Dainty Bow',
    badge: 'Signature Loafer',
    rating: 4.9,
    reviewCount: 88,
    material: 'Handcrafted Vegan Nappa Leather',
    heelHeight: '1.2 cm Flat',
    sku: 'MC-10',
    isActive: true,
  },
  {
    name: 'Taro Velvet Cloud Slip-on',
    category: 'Loafers & Slip-on',
    costPrice: 86000,
    price: 179000,
    stock: 21,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Slip-on beludru taro ungu pastel lembut dengan quilting empuk bagai awan. Sol karet antislip fleksibel yang sangat ringan dipakai jalan santai.',
    imageUrl: '/shoes/mochi-flat-11.jpg',
    color: 'Pastel Taro Velvet Purple',
    badge: 'Super Nyaman',
    rating: 4.8,
    reviewCount: 71,
    material: 'Soft Quilted Velvet + Latex Cushion',
    heelHeight: '1.2 cm Flat',
    sku: 'MC-11',
    isActive: true,
  },
  {
    name: 'Cotton Candy Pastel Loafers',
    category: 'Loafers & Slip-on',
    costPrice: 99000,
    price: 209000,
    stock: 23,
    sizes: [36, 37, 38, 39, 40, 41],
    description: 'Kombinasi warna dua nada baby pink dan baby blue manis seperti permen kapas. Insole berbusa mochi empuk ganda yang membuat kaki tidak cepat pegal.',
    imageUrl: '/shoes/mochi-flat-12.jpg',
    color: 'Cotton Candy Pink & Blue',
    badge: 'Best Seller',
    rating: 4.9,
    reviewCount: 104,
    material: 'Supple Microfiber Suede + Mochi Cushion',
    heelHeight: '1.5 cm Flat',
    sku: 'MC-12',
    isActive: true,
  },
];

// Seed 12 products if empty or synchronize costPrice, prices, and active flags
export async function seedProductsIfEmpty(): Promise<boolean> {
  const collectionRef = collection(db, 'products');
  try {
    const snapshot = await getDocs(collectionRef);
    const now = new Date().toISOString();

    // If empty, write all 12 initial products
    if (snapshot.empty) {
      console.log('Seeding 12 cute Mochi Steps flatshoes products to Firestore...');
      for (let i = 0; i < INITIAL_PRODUCTS.length; i++) {
        const p = INITIAL_PRODUCTS[i];
        const docId = `mochi-flat-${String(i + 1).padStart(2, '0')}`;
        const productDocRef = doc(db, 'products', docId);

        await setDoc(productDocRef, {
          ...p,
          id: docId,
          createdAt: now,
          updatedAt: now,
        });

        const mutationRef = doc(collection(db, 'stock_mutations'));
        await setDoc(mutationRef, {
          id: mutationRef.id,
          productId: docId,
          productName: p.name,
          type: 'IN',
          quantity: p.stock,
          notes: 'Stok Awal Gudang Mochi Steps (Batch Perdana)',
          previousStock: 0,
          newStock: p.stock,
          timestamp: now,
          actor: 'Sistem Inisialisasi Mochi Steps',
        });
      }
      return true;
    }

    // Sync / Backfill costPrice, realistic market prices, sku, and isActive flag to existing Firestore docs
    for (let i = 0; i < INITIAL_PRODUCTS.length; i++) {
      const p = INITIAL_PRODUCTS[i];
      const docId = `mochi-flat-${String(i + 1).padStart(2, '0')}`;
      const productDocRef = doc(db, 'products', docId);
      const existingSnap = await getDoc(productDocRef);

      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        const updates: Record<string, any> = { updatedAt: now };

        // Ensure costPrice exists
        if (existingData.costPrice === undefined || existingData.costPrice === null) {
          updates.costPrice = p.costPrice;
        }
        // Ensure realistic price aligned with mid-tier premium casual range Rp 139.000 - Rp 249.000
        if (!existingData.price || existingData.price < 100000 || existingData.price > 300000) {
          updates.price = p.price;
        }
        // Ensure SKU exists
        if (!existingData.sku) {
          updates.sku = p.sku;
        }
        // Ensure isActive exists
        if (existingData.isActive === undefined) {
          updates.isActive = true;
        }

        if (Object.keys(updates).length > 1) {
          await updateDoc(productDocRef, updates);
        }
      } else {
        // Document doesn't exist, create it
        await setDoc(productDocRef, {
          ...p,
          id: docId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'products');
    return false;
  }
}

// Real-time subscription to Products
export function subscribeToProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
) {
  const collectionRef = collection(db, 'products');
  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const products: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const price = Number(data.price) || 159000;
        const costPrice = Number(data.costPrice) || Math.round(price * 0.5);

        products.push({
          id: docSnap.id,
          name: data.name || '',
          category: data.category || 'Flat Shoes Klasik',
          costPrice,
          price,
          stock: Number(data.stock) || 0,
          sizes: data.sizes || [36, 37, 38, 39, 40, 41],
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          color: data.color || 'Pink Pastel',
          badge: data.badge || undefined,
          rating: Number(data.rating) || 4.9,
          reviewCount: Number(data.reviewCount) || 50,
          material: data.material || 'Microfiber Leather',
          heelHeight: data.heelHeight || '1 cm Flat',
          sku: data.sku || `MC-${docSnap.id.replace('mochi-flat-', '')}`,
          isActive: data.isActive !== false, // Default to true if not set
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      // Sort alphabetically or by id
      products.sort((a, b) => a.id.localeCompare(b.id));
      onData(products);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  );
}

// Real-time subscription to Orders
export function subscribeToOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
) {
  const ordersRef = collection(db, 'orders');
  return onSnapshot(
    ordersRef,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.isPosTransaction) return; // Skip POS transactions for webstore customer orders
        orders.push({
          id: docSnap.id,
          orderNumber: d.orderNumber || docSnap.id,
          customerName: d.customerName || '',
          customerPhone: d.customerPhone || '',
          customerAddress: d.customerAddress || '',
          district: d.district || '',
          subdistrict: d.subdistrict || '',
          city: d.city || '',
          province: d.province || '',
          postalCode: d.postalCode || '',
          landmark: d.landmark || '',
          specialNotes: d.specialNotes || '',
          courier: d.courier || 'J&T Express',
          trackingNumber: d.trackingNumber || '',
          paymentMethod: d.paymentMethod || 'QRIS',
          paymentStatus: d.paymentStatus || 'Menunggu Pembayaran',
          orderStatus: d.orderStatus || 'Menunggu Verifikasi',
          items: (d.items || []).map((item: any) => ({
            productId: item.productId || '',
            name: item.name || '',
            costPrice: Number(item.costPrice) || Math.round((Number(item.price) || 0) * 0.5),
            price: Number(item.price) || 0,
            size: Number(item.size) || 38,
            quantity: Number(item.quantity) || 1,
            imageUrl: item.imageUrl || '',
            color: item.color || '',
          })),
          subtotal: Number(d.subtotal) || 0,
          shippingCost: Number(d.shippingCost) || 0,
          totalAmount: Number(d.totalAmount) || 0,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        });
      });
      // Sort orders descending by createdAt
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(orders);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  );
}

// Real-time subscription to Stock Mutations
export function subscribeToStockMutations(
  onData: (mutations: StockMutation[]) => void,
  onError?: (err: Error) => void
) {
  const mutationsRef = collection(db, 'stock_mutations');
  return onSnapshot(
    mutationsRef,
    (snapshot) => {
      const mutations: StockMutation[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        mutations.push({
          id: docSnap.id,
          productId: d.productId || '',
          productName: d.productName || '',
          type: d.type || 'IN',
          quantity: Number(d.quantity) || 0,
          notes: d.notes || '',
          previousStock: Number(d.previousStock) || 0,
          newStock: Number(d.newStock) || 0,
          referenceId: d.referenceId || undefined,
          correctionOf: d.correctionOf || undefined,
          timestamp: d.timestamp || new Date().toISOString(),
          actor: d.actor || 'Admin',
        });
      });
      // Sort mutations descending by timestamp
      mutations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onData(mutations);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'stock_mutations');
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  );
}

// Real-time subscription to POS Transactions
export function subscribeToPosTransactions(
  onData: (transactions: PosTransaction[]) => void,
  onError?: (err: Error) => void
) {
  const ordersRef = collection(db, 'orders');
  return onSnapshot(
    ordersRef,
    (snapshot) => {
      const transactions: PosTransaction[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (!d.isPosTransaction) return;
        transactions.push({
          id: docSnap.id,
          posNumber: d.posNumber || docSnap.id,
          cashierName: d.cashierName || 'Kasir',
          customerName: d.customerName || 'Pelanggan Walk-in',
          customerPhone: d.customerPhone || '',
          items: d.items || [],
          totalItems: Number(d.totalItems) || 0,
          totalAmount: Number(d.totalAmount) || 0,
          totalCost: Number(d.totalCost) || 0,
          grossProfit: Number(d.grossProfit) || 0,
          paymentMethod: d.paymentMethod || 'Tunai',
          cashTendered: Number(d.cashTendered) || 0,
          changeGiven: Number(d.changeGiven) || 0,
          notes: d.notes || '',
          createdAt: d.createdAt || new Date().toISOString(),
        });
      });
      // Sort descending by createdAt
      transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(transactions);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  );
}

// Create new customer order with atomic stock update & mutation logging
export async function createCustomerOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const orderDocRef = doc(collection(db, 'orders'));

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Verify and read all product stocks first
      const productDocs: { ref: any; currentStock: number; id: string; name: string; qty: number; costPrice: number }[] = [];

      for (const item of orderData.items) {
        const pRef = doc(db, 'products', item.productId);
        const pSnap = await transaction.get(pRef);
        if (!pSnap.exists()) {
          throw new Error(`Produk "${item.name}" tidak ditemukan di database.`);
        }
        const pData = pSnap.data();
        const currentStock = Number(pData.stock) || 0;
        const costPrice = Number(pData.costPrice) || Math.round((Number(item.price) || 0) * 0.5);

        if (currentStock < item.quantity) {
          throw new Error(`Maaf, stok sepatu "${item.name}" tersisa ${currentStock} pasang, tidak mencukupi untuk ${item.quantity} pasang.`);
        }
        productDocs.push({
          ref: pRef,
          currentStock,
          id: item.productId,
          name: item.name,
          qty: item.quantity,
          costPrice,
        });
      }

      // 2. Decrement stock for each product and record mutation
      for (const p of productDocs) {
        const newStock = p.currentStock - p.qty;
        transaction.update(p.ref, {
          stock: newStock,
          updatedAt: now,
        });

        const mutationRef = doc(collection(db, 'stock_mutations'));
        transaction.set(mutationRef, {
          id: mutationRef.id,
          productId: p.id,
          productName: p.name,
          type: 'OUT',
          quantity: p.qty,
          notes: `Pesanan Webstore #${orderData.orderNumber} (${orderData.customerName})`,
          previousStock: p.currentStock,
          newStock,
          referenceId: orderDocRef.id,
          timestamp: now,
          actor: 'Sistem Checkout Pelanggan',
        });
      }

      // Attach snapshot costPrice to order items
      const itemsWithCost = orderData.items.map((item) => {
        const matching = productDocs.find((p) => p.id === item.productId);
        return {
          ...item,
          costPrice: item.costPrice || (matching ? matching.costPrice : Math.round((item.price || 0) * 0.5)),
        };
      });

      // 3. Write Order document
      transaction.set(orderDocRef, {
        ...orderData,
        items: itemsWithCost,
        id: orderDocRef.id,
        createdAt: now,
        updatedAt: now,
      });

      // 4. Upsert Customer in customers collection
      const cleanPhone = orderData.customerPhone.replace(/[^0-9]/g, '') || orderDocRef.id;
      const customerDocRef = doc(db, 'customers', cleanPhone);
      transaction.set(
        customerDocRef,
        {
          name: orderData.customerName,
          phone: orderData.customerPhone,
          address: orderData.customerAddress,
          district: orderData.district,
          city: orderData.city,
          postalCode: orderData.postalCode,
          lastOrderDate: now,
          isActive: true,
          updatedAt: now,
        },
        { merge: true }
      );
    });

    return orderDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'orders');
    throw error;
  }
}

// Process POS Transaction atomically: updates stock, logs mutations, stores receipt
export async function processPosTransaction(posData: Omit<PosTransaction, 'id' | 'createdAt'>): Promise<string> {
  const now = new Date().toISOString();
  const posDocRef = doc(collection(db, 'orders'));

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Verify and read all product stocks first
      const productDocs: { ref: any; currentStock: number; id: string; name: string; qty: number }[] = [];

      for (const item of posData.items) {
        const pRef = doc(db, 'products', item.productId);
        const pSnap = await transaction.get(pRef);
        if (!pSnap.exists()) {
          throw new Error(`Produk "${item.name}" tidak ditemukan di database.`);
        }
        const currentStock = Number(pSnap.data().stock) || 0;
        if (currentStock < item.quantity) {
          throw new Error(`Maaf, stok sepatu "${item.name}" di toko tersisa ${currentStock} pasang, tidak cukup untuk transaksi kasir ${item.quantity} pasang.`);
        }
        productDocs.push({
          ref: pRef,
          currentStock,
          id: item.productId,
          name: item.name,
          qty: item.quantity,
        });
      }

      // 2. Decrement stock for each product and record mutation
      for (const p of productDocs) {
        const newStock = p.currentStock - p.qty;
        transaction.update(p.ref, {
          stock: newStock,
          updatedAt: now,
        });

        const mutationRef = doc(collection(db, 'stock_mutations'));
        transaction.set(mutationRef, {
          id: mutationRef.id,
          productId: p.id,
          productName: p.name,
          type: 'OUT',
          quantity: p.qty,
          notes: `Transaksi Kasir #${posData.posNumber} (${posData.customerName || 'Walk-in'})`,
          previousStock: p.currentStock,
          newStock,
          referenceId: posDocRef.id,
          timestamp: now,
          actor: posData.cashierName || 'Kasir Toko',
        });
      }

      // 3. Save POS transaction document in orders collection with isPosTransaction flag
      transaction.set(posDocRef, {
        ...posData,
        isPosTransaction: true,
        orderNumber: posData.posNumber,
        orderStatus: 'Selesai',
        paymentStatus: 'Dibayar',
        id: posDocRef.id,
        createdAt: now,
      });

      // 4. If customer phone provided, upsert customer record
      if (posData.customerPhone && posData.customerPhone.trim().length > 5) {
        const cleanPhone = posData.customerPhone.replace(/[^0-9]/g, '');
        if (cleanPhone) {
          const customerDocRef = doc(db, 'customers', cleanPhone);
          transaction.set(
            customerDocRef,
            {
              name: posData.customerName || 'Pelanggan Toko',
              phone: posData.customerPhone,
              lastOrderDate: now,
              isActive: true,
              updatedAt: now,
            },
            { merge: true }
          );
        }
      }
    });

    return posDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'orders');
    throw error;
  }
}

// Approve payment: marks as Lunas and Disetujui (DOES NOT decrement stock again)
export async function approvePayment(order: Order, _adminEmail: string = 'Admin'): Promise<void> {
  const now = new Date().toISOString();
  const orderRef = doc(db, 'orders', order.id);

  try {
    await updateDoc(orderRef, {
      paymentStatus: 'Lunas',
      orderStatus: 'Disetujui',
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
  }
}

// Reject payment: marks as Ditolak and restores reserved stock with audit mutation
export async function rejectPayment(order: Order, reason: string = 'Bukti/Pembayaran tidak valid'): Promise<void> {
  const now = new Date().toISOString();
  const orderRef = doc(db, 'orders', order.id);

  try {
    await runTransaction(db, async (transaction) => {
      // Restore stock for items
      for (const item of order.items) {
        const pRef = doc(db, 'products', item.productId);
        const pSnap = await transaction.get(pRef);
        if (pSnap.exists()) {
          const currentStock = Number(pSnap.data().stock) || 0;
          const restoredStock = currentStock + item.quantity;
          transaction.update(pRef, {
            stock: restoredStock,
            updatedAt: now,
          });

          const mutationRef = doc(collection(db, 'stock_mutations'));
          transaction.set(mutationRef, {
            id: mutationRef.id,
            productId: item.productId,
            productName: item.name,
            type: 'RETURN',
            quantity: item.quantity,
            notes: `Restorasi Stok: Pembatalan #${order.orderNumber} (${reason})`,
            previousStock: currentStock,
            newStock: restoredStock,
            referenceId: order.id,
            timestamp: now,
            actor: 'Admin Approval (Reject)',
          });
        }
      }

      transaction.update(orderRef, {
        paymentStatus: 'Ditolak',
        orderStatus: 'Ditolak',
        specialNotes: order.specialNotes ? `${order.specialNotes} | Ditolak: ${reason}` : `Ditolak: ${reason}`,
        updatedAt: now,
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
  }
}

// Update order status with tracking number, cancellation atomic restoration, and options
export async function updateOrderStatus(
  orderId: string,
  orderStatus: OrderStatus,
  options?: {
    trackingNumber?: string;
    paymentStatus?: PaymentStatus;
    cancellationReason?: string;
    actor?: string;
    orderData?: Order;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const orderRef = doc(db, 'orders', orderId);

  // If status is 'Dibatalkan' and orderData is provided, atomically restore stock if not already canceled
  if (orderStatus === 'Dibatalkan' && options?.orderData) {
    const order = options.orderData;
    const isAlreadyCanceled = order.orderStatus === 'Dibatalkan' || order.orderStatus === 'Ditolak';

    if (!isAlreadyCanceled) {
      try {
        await runTransaction(db, async (transaction) => {
          for (const item of order.items) {
            const pRef = doc(db, 'products', item.productId);
            const pSnap = await transaction.get(pRef);
            if (pSnap.exists()) {
              const currentStock = Number(pSnap.data().stock) || 0;
              const restoredStock = currentStock + item.quantity;
              transaction.update(pRef, {
                stock: restoredStock,
                updatedAt: now,
              });

              const mutationRef = doc(collection(db, 'stock_mutations'));
              transaction.set(mutationRef, {
                id: mutationRef.id,
                productId: item.productId,
                productName: item.name,
                type: 'RETURN',
                quantity: item.quantity,
                notes: `Restorasi Stok: Pesanan Dibatalkan #${order.orderNumber} (${options.cancellationReason || 'Admin Cancel'})`,
                previousStock: currentStock,
                newStock: restoredStock,
                referenceId: order.id,
                timestamp: now,
                actor: options.actor || 'Admin',
              });
            }
          }

          const updates: Record<string, any> = {
            orderStatus: 'Dibatalkan',
            updatedAt: now,
          };
          if (options.cancellationReason) {
            updates.specialNotes = order.specialNotes
              ? `${order.specialNotes} | Dibatalkan: ${options.cancellationReason}`
              : `Dibatalkan: ${options.cancellationReason}`;
          }
          transaction.update(orderRef, updates);
        });
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
        throw error;
      }
    }
  }

  try {
    const updates: Record<string, any> = {
      orderStatus,
      updatedAt: now,
    };

    if (options?.trackingNumber !== undefined) {
      updates.trackingNumber = options.trackingNumber.trim();
    }

    if (options?.paymentStatus) {
      updates.paymentStatus = options.paymentStatus;
    } else if (orderStatus === 'Dibayar' || orderStatus === 'Selesai' || orderStatus === 'Disetujui') {
      updates.paymentStatus = 'Lunas';
    } else if (orderStatus === 'Menunggu Pembayaran') {
      updates.paymentStatus = 'Menunggu Pembayaran';
    }

    await updateDoc(orderRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    throw error;
  }
}

// Add manual stock mutation (Restock / Barang Masuk or Manual Out / Adjustment)
export async function recordManualStockMutation(
  productId: string,
  type: 'IN' | 'OUT' | 'ADJUSTMENT',
  quantity: number,
  notes: string,
  actor: string = 'Admin'
): Promise<void> {
  const now = new Date().toISOString();
  const pRef = doc(db, 'products', productId);

  try {
    await runTransaction(db, async (transaction) => {
      const pSnap = await transaction.get(pRef);
      if (!pSnap.exists()) throw new Error('Produk tidak ditemukan');

      const data = pSnap.data();
      const currentStock = Number(data.stock) || 0;
      let newStock = currentStock;

      if (type === 'IN') {
        newStock = currentStock + quantity;
      } else if (type === 'OUT') {
        if (currentStock < quantity) {
          throw new Error(`Stok saat ini (${currentStock}) tidak cukup untuk dikurangi ${quantity}`);
        }
        newStock = currentStock - quantity;
      } else if (type === 'ADJUSTMENT') {
        newStock = quantity; // Absolute adjustment
      }

      transaction.update(pRef, {
        stock: newStock,
        updatedAt: now,
      });

      const mutationRef = doc(collection(db, 'stock_mutations'));
      transaction.set(mutationRef, {
        id: mutationRef.id,
        productId,
        productName: data.name,
        type,
        quantity,
        notes,
        previousStock: currentStock,
        newStock,
        timestamp: now,
        actor,
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'stock_mutations');
  }
}

// Record a compensating stock correction for auditability without tampering history
export async function recordStockCorrection(
  originalMutationId: string,
  productId: string,
  correctionDelta: number, // positive to add stock, negative to reduce
  reason: string,
  actor: string = 'Admin'
): Promise<void> {
  const now = new Date().toISOString();
  const pRef = doc(db, 'products', productId);

  try {
    await runTransaction(db, async (transaction) => {
      const pSnap = await transaction.get(pRef);
      if (!pSnap.exists()) throw new Error('Produk tidak ditemukan');

      const data = pSnap.data();
      const currentStock = Number(data.stock) || 0;
      const newStock = currentStock + correctionDelta;

      if (newStock < 0) {
        throw new Error(`Koreksi stok tidak valid: stok akhir menjadi negatif (${newStock})`);
      }

      transaction.update(pRef, {
        stock: newStock,
        updatedAt: now,
      });

      const mutationRef = doc(collection(db, 'stock_mutations'));
      transaction.set(mutationRef, {
        id: mutationRef.id,
        productId,
        productName: data.name,
        type: 'CORRECTION',
        quantity: Math.abs(correctionDelta),
        notes: `Koreksi Mutasi #${originalMutationId}: ${reason} (${correctionDelta > 0 ? '+' : ''}${correctionDelta} pasang)`,
        previousStock: currentStock,
        newStock,
        referenceId: originalMutationId,
        correctionOf: originalMutationId,
        timestamp: now,
        actor,
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'stock_mutations');
    throw error;
  }
}

// Add new product
export async function addNewProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const pRef = doc(collection(db, 'products'));

  try {
    await setDoc(pRef, {
      ...productData,
      isActive: productData.isActive !== false,
      id: pRef.id,
      createdAt: now,
      updatedAt: now,
    });

    // Record initial mutation
    if (productData.stock > 0) {
      const mutRef = doc(collection(db, 'stock_mutations'));
      await setDoc(mutRef, {
        id: mutRef.id,
        productId: pRef.id,
        productName: productData.name,
        type: 'IN',
        quantity: productData.stock,
        notes: 'Stok Awal Produk Baru',
        previousStock: 0,
        newStock: productData.stock,
        timestamp: now,
        actor: 'Admin Tambah Produk',
      });
    }

    return pRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'products');
    throw error;
  }
}

// Update existing product details
export async function updateProductDetails(productId: string, updates: Partial<Product>): Promise<void> {
  const now = new Date().toISOString();
  const pRef = doc(db, 'products', productId);
  try {
    await updateDoc(pRef, {
      ...updates,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
  }
}

// Non-destructive soft delete / status toggle for products (DATA CANNOT BE PERMANENTLY DELETED)
export async function toggleProductActiveStatus(productId: string, isActive: boolean): Promise<void> {
  const now = new Date().toISOString();
  const pRef = doc(db, 'products', productId);
  try {
    await updateDoc(pRef, {
      isActive,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
  }
}
