import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  CreditCard,
  QrCode,
  Truck,
  Copy,
  Check,
  Building2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  MapPin,
  Phone,
  User,
  Navigation,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { CartItem, PaymentMethod } from '../types';
import { createCustomerOrder } from '../lib/firestoreService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderSuccess: (orderId: string, orderNumber: string) => void;
}

type BankKey = 'BCA' | 'Mandiri' | 'BRI' | 'BNI' | 'BSI' | 'CIMB' | 'Permata';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderSuccess,
}) => {
  if (!isOpen) return null;

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [addressBenchmark, setAddressBenchmark] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Jawa Tengah');
  const [postalCode, setPostalCode] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [courier, setCourier] = useState('J&T Express (Gratis Ongkir - 1-2 Hari)');
  const [paymentType, setPaymentType] = useState<'bank' | 'qris' | 'cod'>('bank');
  const [selectedBank, setSelectedBank] = useState<BankKey>('BCA');
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shippingCost = 0; // Promo Gratis Ongkir Seluruh Indonesia
  const totalAmount = subtotal + shippingCost;

  // Complete List of Supported Bank Accounts & Virtual Accounts (VA)
  const bankAccounts: Record<
    BankKey,
    {
      name: string;
      fullName: string;
      no: string;
      holder: string;
      tagColor: string;
      badge: string;
      code: string;
      instructions: string[];
    }
  > = {
    BCA: {
      name: 'BCA',
      fullName: 'Bank Central Asia (BCA)',
      no: '8291 0284 71',
      holder: 'PT MOCHI STEPS INDONESIA',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      badge: 'VA / Transfer BCA',
      code: '014',
      instructions: [
        'Buka BCA mobile > m-Transfer > BCA Virtual Account / Antar Rekening.',
        'Masukkan nomor rekening 8291028471 a.n PT MOCHI STEPS INDONESIA.',
        'Pastikan nominal transfer sesuai tagihan lalu konfirmasi PIN Anda.',
      ],
    },
    Mandiri: {
      name: 'Mandiri',
      fullName: 'Bank Mandiri (Livin)',
      no: '1370 0192 84712',
      holder: 'PT MOCHI STEPS INDONESIA',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      badge: 'Livin / Mandiri VA',
      code: '008',
      instructions: [
        'Buka aplikasi Livin by Mandiri > Transfer ke Penerima Baru / Bayar VA.',
        'Masukkan nomor 1370019284712 a.n PT MOCHI STEPS INDONESIA.',
        'Periksa nama toko dan total pembayaran lalu klik Lanjut Bayar.',
      ],
    },
    BRI: {
      name: 'BRI',
      fullName: 'Bank Rakyat Indonesia (BRIMO)',
      no: '0129 0100 2938 531',
      holder: 'PT MOCHI STEPS INDONESIA',
      tagColor: 'bg-sky-50 text-sky-700 border-sky-200',
      badge: 'BRIVA / Transfer BRI',
      code: '002',
      instructions: [
        'Buka aplikasi BRImo > menu BRIVA atau Transfer Antar Rekening.',
        'Ketikkan nomor 012901002938531 a.n PT MOCHI STEPS INDONESIA.',
        'Masukkan PIN BRImo Anda untuk menyelesaikan pembayaran.',
      ],
    },
    BNI: {
      name: 'BNI',
      fullName: 'Bank Negara Indonesia (BNI Mobile)',
      no: '0918 2849 12',
      holder: 'PT MOCHI STEPS INDONESIA',
      tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
      badge: 'BNI VA / Transfer',
      code: '009',
      instructions: [
        'Buka BNI Mobile Banking > Transfer > Virtual Account Billing / Rekening BNI.',
        'Input nomor 0918284912 a.n PT MOCHI STEPS INDONESIA.',
        'Cek rincian pembayaran dan masukkan Password Transaksi Anda.',
      ],
    },
    BSI: {
      name: 'BSI',
      fullName: 'Bank Syariah Indonesia (BSI Mobile)',
      no: '7192 8301 92',
      holder: 'PT MOCHI STEPS INDONESIA',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badge: 'BSI Syariah / BSI VA',
      code: '451',
      instructions: [
        'Buka aplikasi BSI Mobile > Bayar / Transfer Rekening BSI.',
        'Masukkan nomor 7192830192 a.n PT MOCHI STEPS INDONESIA.',
        'Periksa nama penerima lalu konfirmasi dengan PIN BSI Mobile Anda.',
      ],
    },
    CIMB: {
      name: 'CIMB Niaga',
      fullName: 'CIMB Niaga (OCTO Mobile)',
      no: '8921 0029 4812',
      holder: 'PT MOCHI STEPS INDONESIA',
      tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
      badge: 'OCTO / CIMB VA',
      code: '022',
      instructions: [
        'Buka OCTO Mobile > Transfer > Rekening CIMB Niaga / Virtual Account.',
        'Masukkan nomor 892100294812 a.n PT MOCHI STEPS INDONESIA.',
        'Konfirmasi nominal transfer dan selesaikan dengan Passcode.',
      ],
    },
    Permata: {
      name: 'Permata',
      fullName: 'Bank Permata (PermataNet)',
      no: '9081 2948 1092',
      holder: 'PT MOCHI STEPS INDONESIA',
      tagColor: 'bg-violet-50 text-violet-700 border-violet-200',
      badge: 'Permata VA',
      code: '013',
      instructions: [
        'Buka PermataMobile X > Bayar Tagihan > Virtual Account.',
        'Masukkan nomor 908129481092 a.n PT MOCHI STEPS INDONESIA.',
        'Periksa jumlah total pembayaran dan konfirmasi otorisasi.',
      ],
    },
  };

  const handleCopy = (text: string, bankKey: string) => {
    navigator.clipboard.writeText(text.replace(/\s+/g, ''));
    setCopiedBank(bankKey);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const handleCopyTotal = () => {
    navigator.clipboard.writeText(String(totalAmount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim()) {
      setErrorMessage('Silakan isi Nama Lengkap Anda.');
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('Silakan isi Nomor WhatsApp yang aktif (minimal 9 digit, contoh: 08123456789).');
      return;
    }
    if (!customerAddress.trim()) {
      setErrorMessage('Silakan isi Alamat Lengkap pengiriman Anda.');
      return;
    }
    if (!district.trim() || !city.trim()) {
      setErrorMessage('Silakan lengkapi Kecamatan dan Kota/Kabupaten pengiriman.');
      return;
    }

    try {
      setIsSubmitting(true);

      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `MCS-2026-${randomCode}`;

      // Construct payment method string
      let finalPaymentMethod: PaymentMethod = 'QRIS';
      if (paymentType === 'bank') {
        finalPaymentMethod = `Bank Transfer ${bankAccounts[selectedBank].name} / VA`;
      } else if (paymentType === 'cod') {
        finalPaymentMethod = 'COD (Bayar di Tempat)';
      }

      // Format clean full address with benchmark
      const fullAddressFormatted = addressBenchmark.trim()
        ? `${customerAddress.trim()} (Patokan: ${addressBenchmark.trim()})`
        : customerAddress.trim();

      const orderData = {
        orderNumber,
        customerName: customerName.trim(),
        customerPhone: cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone,
        customerAddress: fullAddressFormatted,
        district: district.trim(),
        city: city.trim(),
        postalCode: postalCode.trim() || '57143',
        specialNotes: specialNotes.trim()
          ? `[Provinsi: ${province}] ${specialNotes.trim()}`
          : `[Provinsi: ${province}]`,
        courier,
        paymentMethod: finalPaymentMethod,
        paymentStatus: 'Menunggu Pembayaran' as const,
        orderStatus: 'Menunggu Verifikasi' as const,
        items: items.map((it) => ({
          productId: it.product.id,
          name: it.product.name,
          costPrice: it.product.costPrice || Math.round(it.product.price * 0.5),
          price: it.product.price,
          size: it.selectedSize,
          quantity: it.quantity,
          imageUrl: it.product.imageUrl,
          color: it.product.color,
        })),
        subtotal,
        shippingCost,
        totalAmount,
      };

      const docId = await createCustomerOrder(orderData);

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f38ba8', '#e26d8d', '#f9c5d1', '#fff'],
      });

      onOrderSuccess(docId, orderNumber);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Terjadi kendala saat memproses pesanan. Silakan coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-pink-100 p-5 sm:p-8 my-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-pink-100">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#fbcfe8] to-[#fce7f3] flex items-center justify-center text-[#be185d] shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                Checkout & Pengiriman
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-[#be185d]">
                Gratis Ongkir
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Isi alamat lengkap & pilih metode pembayaran transfer bank/VA, QRIS, atau COD.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="space-y-6">
          {/* BAGIAN 1: INFORMASI PENERIMA */}
          <div className="bg-[#fffbfc] p-5 rounded-2xl border border-pink-100/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-100 text-[#be185d] text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>Data Penerima & Kontak</span>
              </h3>
              <span className="text-[11px] text-gray-400">Wajib diisi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-pink-500" />
                  <span>Nama Lengkap Penerima *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kirani Anindya Putri"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-pink-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nomor WhatsApp Aktif *</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081934424901"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-3.5 pr-20 py-2.5 text-xs rounded-xl border border-pink-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300 transition-all font-medium"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                    WhatsApp
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Kurir akan menghubungi WhatsApp ini saat mengantar paket.
                </p>
              </div>
            </div>
          </div>

          {/* BAGIAN 2: ALAMAT LENGKAP PENGIRIMAN (DIRAPIKAN & TERSTRUKTUR LENGKAP) */}
          <div className="bg-[#fffbfc] p-5 rounded-2xl border border-pink-100/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-100 text-[#be185d] text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>Alamat Lengkap Pengiriman (Rapi & Jelas)</span>
              </h3>
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-pink-500" /> Pengantaran Seluruh Indonesia
              </span>
            </div>

            {/* Jalan & No Rumah */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Alamat Jalan, No. Rumah, RT / RW, dan Nama Dusun/Blok *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Contoh: Jl. Slamet Riyadi No. 142, RT 03 / RW 05, Blok Sakura, Kelurahan Sriwedari"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-pink-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300 transition-all"
              />
            </div>

            {/* Patokan Rumah */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-pink-500" />
                <span>Detail Patokan Rumah / Lokasi (Opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Rumah cat putih pagar hitam / Sebelah Toko Berkah / Depan Masjid"
                value={addressBenchmark}
                onChange={(e) => setAddressBenchmark(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-pink-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300 transition-all font-medium"
              />
            </div>

            {/* Baris Rapi: Kecamatan, Kota/Kabupaten, Provinsi, Kode Pos */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kecamatan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Kec. Laweyan"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kota / Kabupaten *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Kota Surakarta"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Provinsi *
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300 bg-white"
                >
                  <option value="Jawa Tengah">Jawa Tengah</option>
                  <option value="DKI Jakarta">DKI Jakarta</option>
                  <option value="Jawa Barat">Jawa Barat</option>
                  <option value="Jawa Timur">Jawa Timur</option>
                  <option value="DI Yogyakarta">DI Yogyakarta</option>
                  <option value="Banten">Banten</option>
                  <option value="Bali">Bali</option>
                  <option value="Sumatera Utara">Sumatera Utara</option>
                  <option value="Sumatera Barat">Sumatera Barat</option>
                  <option value="Riau">Riau</option>
                  <option value="Lampung">Lampung</option>
                  <option value="Sulawesi Selatan">Sulawesi Selatan</option>
                  <option value="Kalimantan Timur">Kalimantan Timur</option>
                  <option value="Lainnya">Provinsi Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kode Pos
                </label>
                <input
                  type="text"
                  placeholder="57143"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300"
                />
              </div>
            </div>

            {/* Catatan Khusus Pengiriman */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-pink-500" />
                <span>Catatan Khusus untuk Kurir (Opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Tolong titipkan di pos satpam jika tidak ada orang di rumah"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-pink-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300"
              />
            </div>
          </div>

          {/* BAGIAN 3: PILIHAN JASA EKSPEDISI PENGIRIMAN */}
          <div className="bg-[#fffbfc] p-5 rounded-2xl border border-pink-100/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-100 text-[#be185d] text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>Pilihan Jasa Ekspedisi</span>
              </h3>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Semua Kurir Gratis Ongkir
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { name: 'J&T Express', desc: 'Estimasi 1-2 Hari', label: 'J&T Express (Gratis Ongkir - 1-2 Hari)' },
                { name: 'SiCepat Halu', desc: 'Estimasi 1-2 Hari', label: 'SiCepat Reguler (Gratis Ongkir - 1-2 Hari)' },
                { name: 'JNE Reguler', desc: 'Estimasi 2-3 Hari', label: 'JNE Regular (Gratis Ongkir - 2-3 Hari)' },
                { name: 'Anteraja', desc: 'Estimasi 1-2 Hari', label: 'Anteraja Reguler (Gratis Ongkir - 1-2 Hari)' },
              ].map((c) => (
                <button
                  type="button"
                  key={c.name}
                  onClick={() => setCourier(c.label)}
                  className={`p-3 rounded-2xl text-left border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                    courier.includes(c.name)
                      ? 'bg-gradient-to-br from-pink-50 to-pink-100/70 border-[#be185d] text-[#be185d] font-bold shadow-xs'
                      : 'bg-white border-pink-100 text-gray-700 hover:bg-pink-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold">{c.name}</span>
                    <Truck className="w-3.5 h-3.5 text-pink-400" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-gray-500">{c.desc}</span>
                    <span className="text-emerald-600 font-bold">Rp 0</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* BAGIAN 4: METODE PEMBAYARAN DENGAN PILIHAN BANK LENGKAP & VIRTUAL ACCOUNT */}
          <div className="bg-[#fffbfc] p-5 rounded-2xl border border-pink-100/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-100 text-[#be185d] text-xs flex items-center justify-center font-bold">
                  4
                </span>
                <span>Metode Pembayaran</span>
              </h3>
              <span className="text-[11px] text-gray-500">Pilih salah satu</span>
            </div>

            {/* Tab Pilihan Pembayaran: Bank / VA, QRIS, COD */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentType('bank')}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                  paymentType === 'bank'
                    ? 'bg-gradient-to-b from-pink-50 to-pink-100 border-[#be185d] text-[#be185d] font-bold shadow-xs ring-2 ring-pink-200'
                    : 'bg-white border-pink-100 text-gray-700 hover:bg-pink-50'
                }`}
              >
                <Building2 className="w-5 h-5 text-[#be185d]" />
                <span className="text-xs font-bold">Transfer Bank / VA</span>
                <span className="text-[10px] text-gray-500">BCA, Mandiri, BRI, BNI dll</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('qris')}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                  paymentType === 'qris'
                    ? 'bg-gradient-to-b from-pink-50 to-pink-100 border-[#be185d] text-[#be185d] font-bold shadow-xs ring-2 ring-pink-200'
                    : 'bg-white border-pink-100 text-gray-700 hover:bg-pink-50'
                }`}
              >
                <QrCode className="w-5 h-5 text-[#be185d]" />
                <span className="text-xs font-bold">QRIS Instant</span>
                <span className="text-[10px] text-gray-500">GoPay, OVO, ShopeePay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('cod')}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                  paymentType === 'cod'
                    ? 'bg-gradient-to-b from-pink-50 to-pink-100 border-[#be185d] text-[#be185d] font-bold shadow-xs ring-2 ring-pink-200'
                    : 'bg-white border-pink-100 text-gray-700 hover:bg-pink-50'
                }`}
              >
                <Truck className="w-5 h-5 text-[#be185d]" />
                <span className="text-xs font-bold">COD (Bayar Ditempat)</span>
                <span className="text-[10px] text-gray-500">Bayar saat sepatu sampai</span>
              </button>
            </div>

            {/* JIKA TRANSFER BANK / VA DIPILIH: TAMPILKAN PILIHAN BANK LENGKAP */}
            {paymentType === 'bank' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-pink-200 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-900">
                      Pilih Bank Rekening / Virtual Account (VA):
                    </label>
                    <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Verifikasi Real-Time
                    </span>
                  </div>

                  {/* Tombol Pilihan Bank */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(bankAccounts) as BankKey[]).map((key) => {
                      const b = bankAccounts[key];
                      const isSelected = selectedBank === key;
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setSelectedBank(key)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#be185d] text-white border-[#be185d] shadow-2xs font-bold'
                              : 'bg-gray-50 text-gray-700 hover:bg-pink-50 border-gray-200 font-medium'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">{b.name}</p>
                            <p className={`text-[9px] ${isSelected ? 'text-pink-100' : 'text-gray-400'}`}>
                              Kode: {b.code}
                            </p>
                          </div>
                          {isSelected && <BadgeCheck className="w-4 h-4 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detail Rekening Bank / Virtual Account yang Dipilih */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#fff7f9] to-[#fdf0f4] border border-pink-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-pink-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">
                          {bankAccounts[selectedBank].fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-[#be185d]">
                          {bankAccounts[selectedBank].badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Rekening Resmi Mochi Steps Official
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-gray-500">Total Ditransfer:</p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-extrabold text-base text-[#be185d]">
                          {formatRupiah(totalAmount)}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyTotal}
                          className="px-2 py-0.5 rounded-md bg-white border border-pink-200 text-[10px] font-semibold text-[#be185d] hover:bg-pink-50 cursor-pointer"
                        >
                          {copiedAmount ? 'Tersalin!' : 'Salin Total'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Kotak Nomor Rekening & Tombol Salin */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-pink-200 shadow-2xs">
                    <div>
                      <p className="text-[11px] text-gray-500">Nomor Rekening / Virtual Account:</p>
                      <p className="font-mono text-lg font-extrabold text-[#be185d] tracking-wider select-all">
                        {bankAccounts[selectedBank].no}
                      </p>
                      <p className="text-[11px] text-gray-600 font-semibold mt-0.5">
                        a.n {bankAccounts[selectedBank].holder}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(bankAccounts[selectedBank].no, selectedBank)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white hover:opacity-95 transition-all flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer"
                    >
                      {copiedBank === selectedBank ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-white" />
                          <span>Salin Nomor</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Petunjuk Pembayaran M-Banking */}
                  <div className="space-y-1.5 text-[11px] text-gray-600 bg-white/70 p-3 rounded-xl border border-pink-100">
                    <p className="font-bold text-gray-800">Petunjuk Transfer M-Banking / ATM:</p>
                    <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
                      {bankAccounts[selectedBank].instructions.map((ins, idx) => (
                        <li key={idx}>{ins}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* JIKA QRIS DIPILIH */}
            {paymentType === 'qris' && (
              <div className="p-4 rounded-2xl bg-white border border-pink-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800">QRIS Standar Pembayaran Nasional</span>
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                    Bebas Biaya Admin
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#fdf8fa] p-4 rounded-xl border border-pink-100">
                  <div className="w-36 h-36 bg-white p-2.5 rounded-2xl border border-pink-200 shadow-xs shrink-0 flex flex-col items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <rect width="100" height="100" fill="#ffffff" />
                      <path d="M10,10 h25 v25 h-25 z M15,15 v15 h15 v-15 z M19,19 h7 v7 h-7 z" fill="#221815" />
                      <path d="M65,10 h25 v25 h-25 z M70,15 v15 h15 v-15 z M74,19 h7 v7 h-7 z" fill="#221815" />
                      <path d="M10,65 h25 v25 h-25 z M15,70 v15 h15 v-15 z M19,74 h7 v7 h-7 z" fill="#221815" />
                      <rect x="42" y="10" width="16" height="5" fill="#221815" />
                      <rect x="42" y="20" width="8" height="15" fill="#221815" />
                      <rect x="54" y="25" width="6" height="10" fill="#221815" />
                      <rect x="10" y="42" width="12" height="6" fill="#221815" />
                      <rect x="25" y="42" width="10" height="18" fill="#221815" />
                      <rect x="40" y="42" width="20" height="16" fill="#221815" />
                      <rect x="65" y="42" width="10" height="10" fill="#221815" />
                      <rect x="80" y="42" width="10" height="20" fill="#221815" />
                      <rect x="42" y="65" width="15" height="10" fill="#221815" />
                      <rect x="62" y="65" width="28" height="6" fill="#221815" />
                      <circle cx="50" cy="50" r="10" fill="#be185d" />
                      <text x="50" y="53" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold">
                        MS
                      </text>
                    </svg>
                  </div>

                  <div className="space-y-1.5 text-xs text-center sm:text-left">
                    <p className="font-bold text-gray-900 text-sm">PT MOCHI STEPS INDONESIA</p>
                    <p className="text-[11px] text-gray-500 font-mono">NMID: ID1020261928471</p>
                    <p className="text-[11px] text-gray-600 leading-relaxed pt-1">
                      Scan kode QR di atas memakai aplikasi e-wallet (GoPay, OVO, ShopeePay, Dana, LinkAja) atau mobile banking apapun.
                    </p>
                    <p className="text-[11px] font-bold text-[#be185d]">
                      Nominal Transfer: {formatRupiah(totalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* JIKA COD DIPILIH */}
            {paymentType === 'cod' && (
              <div className="p-4 rounded-2xl bg-white border border-pink-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Bayar Tunai Saat Sepatu Flatshoes Sampai di Rumah</span>
                </div>
                <p className="text-gray-500 leading-relaxed text-[11px]">
                  Siapkan uang tunai sejumlah <b className="text-gray-900">{formatRupiah(totalAmount)}</b> saat kurir tiba. Paket Anda diproses dengan aman & terjamin.
                </p>
              </div>
            )}
          </div>

          {/* RINGKASAN BELANJA & TOMBOL BUAT PESANAN */}
          <div className="bg-[#fff2f5] p-5 rounded-2xl border border-pink-200 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Subtotal ({items.reduce((s, it) => s + it.quantity, 0)} pasang sepatu):</span>
              <span className="font-semibold text-gray-900">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Ongkos Kirim ({courier.split(' ')[0]}):</span>
              <span className="font-bold text-emerald-600">GRATIS</span>
            </div>
            <div className="pt-2 border-t border-pink-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 block">Total Pembayaran:</span>
                <span className="text-xl sm:text-2xl font-extrabold font-heading text-[#be185d]">
                  {formatRupiah(totalAmount)}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3.5 rounded-2xl font-bold text-xs tracking-wider bg-gradient-to-r from-[#d65b7d] via-[#e26d8d] to-[#be185d] text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Menyimpan ke Firestore...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Buat Pesanan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
