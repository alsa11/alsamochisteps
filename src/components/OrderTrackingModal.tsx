import React, { useState } from 'react';
import { X, Search, Truck, Clock, CheckCircle2, PackageCheck, AlertCircle, Phone } from 'lucide-react';
import { Order } from '../types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  initialSearch?: string;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  orders,
  initialSearch = '',
}) => {
  if (!isOpen) return null;

  const [searchKey, setSearchKey] = useState(initialSearch);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const filteredOrders = searchKey.trim()
    ? orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(searchKey.toLowerCase().trim()) ||
          o.customerPhone.replace(/[^0-9]/g, '').includes(searchKey.replace(/[^0-9]/g, '').trim())
      )
    : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Dibayar':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Diproses':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Dikemas':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Dikirim':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Selesai':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Dibatalkan':
      case 'Ditolak':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Disetujui':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#fbcfe8] to-[#fce7f3] flex items-center justify-center text-[#be185d]">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
              Lacak Pesanan Flatshoes
            </h2>
            <p className="text-xs text-gray-500">
              Masukkan Nomor Pesanan (contoh: MCS-2026-...) atau Nomor WhatsApp Anda.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Ketik nomor pesanan atau no. telepon..."
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-pink-200 bg-pink-50/40 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300 transition-all font-medium"
          />
          <Search className="w-5 h-5 text-pink-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Order Results */}
        {searchKey.trim() === '' ? (
          <div className="text-center py-12 text-gray-400 text-xs">
            Silakan masukkan nomor pesanan Anda pada kolom di atas untuk mengecek status live.
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-10 bg-pink-50/50 rounded-2xl border border-pink-100 p-6 space-y-2">
            <AlertCircle className="w-8 h-8 text-pink-400 mx-auto" />
            <p className="text-sm font-bold text-gray-800">Pesanan Tidak Ditemukan</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Pastikan nomor pesanan atau no telepon yang dimasukkan sudah sesuai saat checkout. Hubungi admin kami jika membutuhkan bantuan.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-5 rounded-2xl border border-pink-100 bg-[#fffbfc] shadow-2xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100/60 pb-3">
                  <div>
                    <span className="font-mono font-bold text-sm text-[#be185d]">
                      {order.orderNumber}
                    </span>
                    <span className="text-[11px] text-gray-400 ml-2">
                      {new Date(order.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                      order.orderStatus
                    )}`}
                  >
                    {order.orderStatus}
                  </span>
                </div>

                {/* Tracking Progress Stepper */}
                <div className="py-2">
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                    <div
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                        order.orderStatus !== 'Ditolak' && order.orderStatus !== 'Dibatalkan'
                          ? 'bg-emerald-50 text-emerald-800 font-bold'
                          : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Dipesan</span>
                    </div>

                    <div
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                        ['Dibayar', 'Diproses', 'Dikemas', 'Disetujui', 'Dikirim', 'Selesai'].includes(order.orderStatus)
                          ? 'bg-blue-50 text-blue-800 font-bold'
                          : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Diproses</span>
                    </div>

                    <div
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                        ['Dikirim', 'Selesai'].includes(order.orderStatus)
                          ? 'bg-cyan-50 text-cyan-800 font-bold'
                          : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      <span>Dikirim</span>
                    </div>

                    <div
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 ${
                        order.orderStatus === 'Selesai'
                          ? 'bg-emerald-50 text-emerald-800 font-bold'
                          : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Selesai</span>
                    </div>
                  </div>
                </div>

                {order.trackingNumber && (
                  <div className="p-2.5 rounded-xl bg-cyan-50/70 border border-cyan-200 flex items-center justify-between text-xs">
                    <span className="text-cyan-900 font-medium">No. Resi Pengiriman:</span>
                    <span className="font-mono font-bold text-cyan-900 bg-white px-2 py-0.5 rounded-md border border-cyan-200">
                      {order.trackingNumber}
                    </span>
                  </div>
                )}

                {/* Items preview */}
                <div className="space-y-1.5 pt-1 text-xs">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-gray-700">
                      <span>
                        {item.name} <span className="text-pink-600 font-semibold">(EU {item.size})</span> × {item.quantity}
                      </span>
                      <span className="font-medium">{formatRupiah(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-pink-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Ekspedisi: <b className="text-gray-800">{order.courier}</b>
                  </span>
                  <span className="font-heading font-extrabold text-[#be185d]">
                    Total: {formatRupiah(order.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
