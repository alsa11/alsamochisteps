# Mochi Steps — POS Kasir, Inventory & Sales Audit Architecture

Comprehensive continuation plan for Mochi Steps flatshoes webstore and administrative suite. This plan establishes an audit-first, non-destructive transactional architecture connecting online webstore shoppers and in-person retail cashier operations to a single unified Firestore database.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product and business decisions were clarified and confirmed with the user in Phase 1:

- **Confirmed Pricing Strategy**: Mid-tier premium casual flatshoes range from **Rp 139.000 to Rp 249.000** for all 12 collection items (with corresponding cost of goods / buy prices between Rp 70.000 and Rp 120.000, yielding healthy 40%–55% margins).
- **Confirmed Sales Recognition Policy**: The Sales Report strictly recognizes **Paid Online Orders (`paymentStatus: 'Lunas'`)** and **Completed In-Person POS Transactions**. Pending COD orders and unpaid transactions are tracked in order pipelines but excluded from realized revenue.
- **Confirmed POS Receipt Flow**: Upon transaction completion at the cashier, an interactive digital receipt modal displays immediately with direct options to print, download receipt, and start a new transaction.
- **Strict Non-Destructive Invariant**: Master data (products, categories, customers) and historical transactions (orders, POS receipts, stock mutations) cannot be permanently deleted. Deletion actions in the UI and services are replaced with archive/status toggles (`isActive: boolean`) and correction/reversal entries.

---

## 1. Overview & Core Concept

- **What It Does**: A complete omnichannel flatshoes retail platform featuring a responsive customer-facing webstore and an administrative back-office with POS Kasir, inventory tracking, payment verification, and gross profit analytics.
- **Target Audience / Persona**:
  - *Shoppers*: Modern women seeking stylish, ultra-comfortable flatshoes with cushion insole technology across 3 curated collections.
  - *Cashiers & Store Staff*: Fast checkout workflow with barcode/search lookup, automatic change calculation, instant stock deduction, and digital receipts.
  - *Store Owner / Admin*: Real-time oversight over inventory mutations, payment approvals, profit margins, and sales reporting.
- **Key Value**: Guaranteed inventory consistency across online and physical store channels without overselling, backed by immutable audit trails and transparent profitability metrics.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Customer Webstore Journey**:
   - Shopper lands on Mochi Steps, browses 12 active flatshoe models filtered by 3 categories (*Flat Shoes Klasik*, *Pointed Elegant*, *Loafers & Slip-on*).
   - Selects size (36–41), adds to cart, and proceeds through checkout.
   - Submits delivery details and payment method (QRIS, Virtual Accounts, Bank Transfer, COD).
   - System atomically reserves stock and generates a unique tracking code (e.g., `MOCHI-849201`).

2. **Cashier POS Journey**:
   - Admin opens POS Kasir tab in Admin Portal.
   - Selects customer or quick walk-in buyer, searches products by keyword or category.
   - Adjusts shoe sizes and quantities; system validates real-time available stock.
   - Chooses payment method (Tunai/Cash, QRIS, Transfer Bank, Kartu Debit).
   - If Tunai: inputs cash received, views automatic change calculation with one-click quick nominal buttons (e.g. Pas, Rp 150k, Rp 200k, Rp 500k).
   - Completes transaction: stock is decremented atomically, `pos_transactions` document created, mutation logged, and digital receipt modal opens with printable layout.

3. **Inventory & Cost Management Journey**:
   - Admin inspects inventory status and stock level warnings.
   - Records stock intake (Barang Masuk / Restock), outbound adjustments, or damage write-offs with mandatory audit reason.
   - Configures product pricing using the automated **Markup** (`harga jual = harga beli × (1 + markup%)`) or **Margin** (`harga jual = harga beli / (1 - margin%)`) calculator with neat thousand-rounding.
   - Toggles product active/archived status instead of deleting.

4. **Payment Approval & Order Fulfillment**:
   - Admin reviews uploaded payment proofs for online orders.
   - Approves payment (updates status to *Lunas* and *Disetujui* without double-deducting stock).
   - In case of rejection/cancellation: order is marked *Ditolak* and reserved stock is safely returned to inventory via an atomic reversal transaction.

5. **Sales Reporting & Profit Analytics**:
   - Admin filters performance by timeframe (Hari Ini, 7 Hari, Bulan Ini, Kustom).
   - Analyzes Total Omset Lunas, Total Unit Terjual, Estimasi Laba Kotor (Gross Profit = Sell Price Snapshot - Cost Price Snapshot), Online vs POS breakdown, and top-selling styles.
   - Clicks any metric or row to inspect the underlying source orders/POS receipts for audit clarity.

### Visual Identity & Theme
- **Color Palette**: Sophisticated warm pastel palette:
  - Canvas: Cream Soft White (`#FCFBF9`, `#FFFDFB`)
  - Primary Accent: Pastel Mochi Rose / Pink (`#E08A9E`, `#C96B81`)
  - Secondary Accents: Warm Peach (`#FBE8DE`), Soft Lilac (`#E8E0F0`), Warm Neutral Slate (`#3E3839`)
  - Surface Containers: Pure White with subtle hairline borders (`border-rose-100/60` and `shadow-sm`)
- **Typography**: Clean display headline styling (`Plus Jakarta Sans`) paired with clear body typography and tabular numbers (`tabular-nums font-mono`) for all prices, stock counts, and financial totals.
- **Zero-Pill Discipline**: Metadata displayed with clean separators (`·` or `/`), avoiding unnecessary pill badges. Interactive tab controls use segmented button styling.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Elimination of Permanent Deletion (Audit-First Rule)**
  - *Chosen Approach*: Replace `deleteProduct` and permanent deletion buttons with an `isActive: boolean` status toggle and archive state. Orders, POS transactions, and stock logs are immutable. Corrections are logged as new compensating transactions with reference IDs.
  - *Why*: In a retail business, deleting a product orphans historical order lines, invalidates sales reports, and destroys accounting integrity. Soft-delete preserves relational integrity.
  - *Alternatives Considered*: Hard delete with cascade (rejected: causes irrecoverable data loss and breaks reporting).

- **Decision 2: Single-Point Stock Reservation at Checkout & POS**
  - *Chosen Approach*: Stock is reserved and decremented inside a Firestore atomic transaction at the moment checkout or POS payment succeeds. Approval of payment by admin confirms payment status (`Lunas`), and DOES NOT deduct stock a second time.
  - *Why*: Eliminates race conditions and prevents overselling while guaranteeing that admin approval is idempotent.
  - *Alternatives Considered*: Decrementing on admin approval (rejected: allows multiple customers to purchase the last pair of shoes concurrently).

- **Decision 3: Snapshot-Based Gross Profit Tracking**
  - *Chosen Approach*: Each order line item and POS sale item saves an immutable snapshot of `costPrice` (harga modal) and `price` (harga jual) at transaction time.
  - *Why*: If admin updates product prices in the future, past transaction records and historical gross profit reports remain 100% accurate.
  - *Alternatives Considered*: Looking up current product price during report generation (rejected: distorts historical profitability).

- **Decision 4: Transparent Markup vs Margin Auto-Calculation**
  - *Chosen Approach*: Product editor provides dual calculation modes:
    - Markup formula: $\text{Sell Price} = \text{Cost Price} \times (1 + \frac{\text{Markup } \%}{100})$
    - Margin formula: $\text{Sell Price} = \frac{\text{Cost Price}}{1 - \frac{\text{Margin } \%}{100}}$
    - With real-time preview of Gross Profit per unit and 1.000 Rupiah rounding before save.
  - *Why*: Empowers the merchant to set pricing aligned with Indonesian footwear retail conventions.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MOCHI STEPS CLIENT (REACT)                       │
├──────────────────────────────────┬─────────────────────────────────────┤
│       CUSTOMER WEBSTORE          │             ADMIN PORTAL            │
│  - Catalog & Search (12 shoes)   │  - POS Kasir (Struk & Cash Tender)  │
│  - Active Filter (isActive)      │  - Products (Modal, Markup/Margin)  │
│  - Size & Stock Verification     │  - Inventory & Stock Reversals      │
│  - Cart Drawer & Checkout Modal  │  - Order Management & Approvals     │
│  - Order Tracking (#MOCHI-XXXX)  │  - Laporan Sales & Gross Profit     │
└─────────────────┬────────────────┴──────────────────┬──────────────────┘
                  │                                   │
                  ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FIRESTORE SERVICE (TRANSACTIONS)                     │
│  - processCheckout() -> Atomic stock OUT + Order + Customer Upsert     │
│  - processPosTransaction() -> Atomic stock OUT + POS Doc + Mutation    │
│  - approvePayment() -> Status to 'Lunas' & 'Disetujui' (no 2nd deduc)   │
│  - rejectPayment() -> Atomic stock IN restoration + Mutation           │
│  - recordManualStockMutation() / recordStockCorrection()               │
│  - toggleProductStatus() -> Soft archive / active switch               │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     FIRESTORE COLLECTIONS & SCHEMAS                    │
│  /products/{id}               -> name, costPrice, price, stock, active │
│  /orders/{orderId}            -> orderNumber, items, paymentStatus, .. │
│  /pos_transactions/{posId}    -> posNumber, items, tender, change, ..  │
│  /stock_mutations/{mutId}     -> type, qty, previousStock, newStock    │
│  /customers/{phone}           -> totalOrders, totalSpent, profile      │
└────────────────────────────────────────────────────────────────────────┘
```

### Entity Schemas

1. **`products`**:
   - `id: string`
   - `name: string`
   - `category: 'Flat Shoes Klasik' | 'Pointed Elegant' | 'Loafers & Slip-on'`
   - `costPrice: number` (Harga Beli / Modal, e.g. Rp 75.000)
   - `price: number` (Harga Jual, e.g. Rp 149.000)
   - `stock: number`
   - `sizes: number[]` (e.g. [36, 37, 38, 39, 40, 41])
   - `isActive: boolean` (True for active, False for archived/deactivated)
   - `description: string`, `imageUrl: string`, `color: string`, `material: string`, `heelHeight: string`
   - `rating: number`, `reviewCount: number`

2. **`orders`**:
   - `id: string`, `orderNumber: string` (e.g. `MOCHI-829104`)
   - `customerName: string`, `customerPhone: string`, `customerAddress: string`
   - `paymentMethod: PaymentMethod`, `paymentStatus: PaymentStatus`, `orderStatus: OrderStatus`
   - `items: OrderItem[]` with `costPrice`, `price`, `size`, `quantity`, `subtotal`
   - `subtotal: number`, `shippingCost: number`, `totalAmount: number`
   - `createdAt: string`, `updatedAt: string`

3. **`pos_transactions`**:
   - `id: string`, `posNumber: string` (e.g. `POS-20261014-9182`)
   - `cashierName: string`
   - `customerName: string` (or 'Walk-in Customer')
   - `items: PosItem[]` (with `productId`, `name`, `size`, `quantity`, `costPrice`, `price`, `total`)
   - `totalAmount: number`, `totalCost: number`, `grossProfit: number`
   - `paymentMethod: 'Tunai' | 'QRIS' | 'Debit/Kredit' | 'Transfer'`
   - `cashTendered: number`, `changeGiven: number`
   - `createdAt: string`

4. **`stock_mutations`**:
   - `id: string`, `productId: string`, `productName: string`
   - `type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'CORRECTION'`
   - `quantity: number`, `previousStock: number`, `newStock: number`
   - `notes: string`, `referenceId?: string`, `actor: string`, `timestamp: string`

---

## 5. Execution Steps

1. **Repository Synchronization**:
   - Import all existing assets (`public/shoes/mochi-flat-01.jpg`..`12.jpg`), branding, and styles from the cloned repository into the workspace root.
   - Update `package.json` with required dependencies (`firebase`, `canvas-confetti`, `@types/canvas-confetti`).
   - Sync `metadata.json` and `index.html` with accurate Mochi Steps title and branding.

2. **Database & Service Layer Enhancements (`firestoreService.ts`)**:
   - Add realistic Indonesian market prices (Rp 139.000 – Rp 249.000) and cost prices (Rp 70.000 – Rp 110.000) to the product seed catalog.
   - Implement `processPosTransaction` with atomic transaction for inventory deduction, mutation logging, and transaction creation.
   - Remove permanent deletion (`deleteProduct`), replacing it with `toggleProductActiveStatus(productId, isActive)`.
   - Add `recordStockCorrection(mutationId, reason, actor)` for auditing adjustments without tampering with historical records.
   - Subscribe and fetch helpers for `pos_transactions`.

3. **POS Kasir Implementation**:
   - Build complete interactive cashier module in Admin Portal:
     - Product catalog with live search, category pills, and size selection.
     - Cashier shopping cart with quantity adjustment and instant subtotals.
     - Payment processor with auto-calculated change for cash payments and quick nominal chips.
     - Printable digital receipt modal (`Struk Belanja Mochi Steps`) showing transaction number, store info, items, payment method, cash, and change.

4. **Pricing & Inventory Management**:
   - Add Markup and Margin interactive calculators into the Add/Edit Product modal.
   - Provide instant preview: "Harga Beli: Rp80.000 + Markup 75% = Harga Jual: Rp140.000 (Laba Kotor: Rp60.000 / unit)".
   - Update Stock Mutation view to display full audit history, transaction references, and correction action.
   - Add status toggle (Aktif / Nonaktifkan) on products table; permanently remove delete buttons.

5. **Laporan Sales & Profit Analytics Upgrade**:
   - Aggregate both Paid Online Orders (`paymentStatus: 'Lunas'`) and POS Transactions.
   - Calculate Gross Profit from transaction snapshot costs.
   - Breakdown by channel (Online vs POS Kasir), top products, and categories.
   - Interactive source audit list allowing admin to inspect individual receipts.

6. **Verification & Testing**:
   - Test compile via `compile_applet`.
   - Verify checkout stock deduction, payment approval (no double deduction), POS checkout, and non-destructive status updates.
