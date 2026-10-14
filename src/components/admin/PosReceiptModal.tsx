import React from 'react';
import { PosTransaction } from '../../types';
import { Printer, CheckCircle, Plus, X } from 'lucide-react';
import { MochiLogo } from '../MochiLogo';

interface PosReceiptModalProps {
  transaction: PosTransaction | null;
  onClose: () => void;
  onNewTransaction: () => void;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  transaction,
  onClose,
  onNewTransaction,
}) => {
  if (!transaction) return null;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 sm:p-7 space-y-4 print:max-w-none print:shadow-none print:border-none print:p-2 print:overflow-visible">
        
        {/* Close Button (Hidden on Print) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 transition-colors print:hidden cursor-pointer"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Badge (Hidden on Print) */}
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100 w-fit print:hidden">
          <CheckCircle className="w-4 h-4" />
          <span>Transaksi POS Berhasil Disimpan</span>
        </div>

        {/* Receipt Container (Designed to look like authentic thermal/slip receipt) */}
        <div className="bg-[#fffdfd] border border-gray-200/80 rounded-2xl p-5 font-mono text-xs text-gray-800 space-y-3.5 shadow-2xs print:border-none print:p-0">
          
          {/* Header */}
          <div className="text-center space-y-1 border-b border-dashed border-gray-300 pb-3">
            <div className="flex justify-center mb-1">
              <MochiLogo size="sm" variant="compact" />
            </div>
            <p className="font-bold text-sm tracking-wider uppercase font-sans text-gray-900">
              MOCHI STEPS STORE
            </p>
            <p className="text-[11px] text-gray-500 font-sans">
              Jl. Malioboro Fashion Square No. 12, Yogyakarta
            </p>
            <p className="text-[10px] text-gray-400 font-sans">
              WhatsApp: 0812-3456-7890 • IG: @mochisteps.id
            </p>
          </div>

          {/* Meta Info */}
          <div className="text-[11px] space-y-1 text-gray-600 border-b border-dashed border-gray-300 pb-2.5">
            <div className="flex justify-between">
              <span>No. Transaksi:</span>
              <span className="font-bold text-gray-900">{transaction.posNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal / Waktu:</span>
              <span>{new Date(transaction.createdAt).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span className="font-semibold text-gray-800">{transaction.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span>{transaction.customerName} {transaction.customerPhone ? `(${transaction.customerPhone})` : ''}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 border-b border-dashed border-gray-300 pb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex justify-between">
              <span>Item / Ukuran</span>
              <span>Subtotal</span>
            </div>
            {transaction.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-semibold text-gray-900">
                  <span className="line-clamp-1 max-w-[220px]">{item.name}</span>
                  <span>{formatRupiah(item.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Size {item.size} • {item.quantity} x {formatRupiah(item.price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals & Payments */}
          <div className="space-y-1 text-xs pt-1">
            <div className="flex justify-between text-gray-600">
              <span>Total Pasang Sepatu:</span>
              <span className="font-bold text-gray-900">{transaction.totalItems} pasang</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>TOTAL BELANJA:</span>
              <span className="text-[#be185d]">{formatRupiah(transaction.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600 pt-1">
              <span>Metode Pembayaran:</span>
              <span className="font-semibold text-gray-800">{transaction.paymentMethod}</span>
            </div>

            {transaction.paymentMethod === 'Tunai' && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Uang Diterima:</span>
                  <span className="font-semibold">{formatRupiah(transaction.cashTendered)}</span>
                </div>
                <div className="flex justify-between text-gray-800 font-bold bg-pink-50/60 p-1.5 rounded-lg text-[13px]">
                  <span>Kembalian:</span>
                  <span className="text-emerald-700">{formatRupiah(transaction.changeGiven)}</span>
                </div>
              </>
            )}

            {transaction.notes && (
              <p className="text-[10px] text-gray-400 italic pt-1">
                Catatan: {transaction.notes}
              </p>
            )}
          </div>

          {/* Receipt Footer Message */}
          <div className="text-center pt-3 border-t border-dashed border-gray-300 space-y-1">
            <p className="font-bold text-[11px] text-[#be185d] font-sans">
              🌸 Terima Kasih Telah Berbelanja! 🌸
            </p>
            <p className="text-[10px] text-gray-500 font-sans leading-tight">
              Langkah cantik, empuk, dan selembut mochi setiap hari.
            </p>
            <p className="text-[9px] text-gray-400 font-sans">
              Tukar ukuran maksimal 3 hari sejak struk terbit dengan sepatu kondisi prima.
            </p>
          </div>
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="flex gap-2.5 pt-1 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk (Print)</span>
          </button>

          <button
            onClick={onNewTransaction}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#d65b7d] to-[#be185d] hover:brightness-105 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Transaksi Baru</span>
          </button>
        </div>

      </div>
    </div>
  );
};
