import React, { useState, useEffect } from 'react';
import { Calculator, Check, ArrowRight, Sparkles } from 'lucide-react';

interface ProductPricingCalculatorProps {
  costPrice: number;
  onApplyPrice: (calculatedSellingPrice: number) => void;
}

export const ProductPricingCalculator: React.FC<ProductPricingCalculatorProps> = ({
  costPrice,
  onApplyPrice,
}) => {
  const [mode, setMode] = useState<'markup' | 'margin'>('markup');
  const [percentage, setPercentage] = useState<number>(75);
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [roundedPrice, setRoundedPrice] = useState<number>(0);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  useEffect(() => {
    if (!costPrice || costPrice <= 0) {
      setCalculatedPrice(0);
      setRoundedPrice(0);
      return;
    }

    let rawPrice = 0;
    if (mode === 'markup') {
      // Markup: harga jual = harga beli * (1 + persentase markup / 100)
      rawPrice = costPrice * (1 + percentage / 100);
    } else {
      // Margin: harga jual = harga beli / (1 - persentase margin / 100)
      const validMargin = Math.min(percentage, 95);
      rawPrice = costPrice / (1 - validMargin / 100);
    }

    // Rounding to nearest thousand
    const rounded = Math.round(rawPrice / 1000) * 1000;
    setCalculatedPrice(Math.round(rawPrice));
    setRoundedPrice(rounded);
  }, [costPrice, mode, percentage]);

  const grossProfit = roundedPrice - costPrice;
  const actualMarginPct = roundedPrice > 0 ? ((grossProfit / roundedPrice) * 100).toFixed(1) : '0';
  const actualMarkupPct = costPrice > 0 ? ((grossProfit / costPrice) * 100).toFixed(1) : '0';

  return (
    <div className="bg-[#fef8fa] border border-pink-200/90 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pink-100 text-[#be185d] flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <span className="font-heading font-bold text-xs text-gray-900">
            Kalkulator Otomatis Harga Jual
          </span>
        </div>
        <div className="flex bg-white rounded-lg p-0.5 border border-pink-100 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('markup');
              setPercentage(75);
            }}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              mode === 'markup'
                ? 'bg-[#be185d] text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Markup (%)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('margin');
              setPercentage(45);
            }}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              mode === 'margin'
                ? 'bg-[#be185d] text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Margin (%)
          </button>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <label className="text-gray-600 text-[11px]">
            Target Persentase {mode === 'markup' ? 'Markup' : 'Margin'}:
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={mode === 'margin' ? 95 : 500}
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value) || 0)}
              className="w-16 px-2 py-1 text-right font-mono font-bold text-xs rounded-lg border border-pink-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#be185d]"
            />
            <span className="font-bold text-gray-500">%</span>
          </div>
        </div>

        {/* Quick Percentage Chips */}
        <div className="flex gap-1 flex-wrap pt-0.5">
          {(mode === 'markup' ? [40, 50, 75, 100, 120] : [30, 40, 45, 50, 60]).map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setPercentage(pct)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                percentage === pct
                  ? 'bg-pink-100 text-[#be185d] border-pink-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Result Formula & Breakdown */}
        <div className="p-2.5 rounded-xl bg-white border border-pink-100/80 space-y-1.5 text-[11px]">
          <div className="flex justify-between text-gray-600">
            <span>Rumus:</span>
            <span className="font-mono text-gray-500">
              {mode === 'markup'
                ? `HB × (1 + ${percentage}%)`
                : `HB / (1 - ${percentage}%)`}
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-700">
            <span>Hasil Hitung (Pembulatan Ribuan):</span>
            <span className="font-mono font-extrabold text-sm text-[#be185d]">
              {formatRupiah(roundedPrice)}
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-100">
            <span>Estimasi Laba Kotor per Unit:</span>
            <span className="font-semibold text-emerald-700">
              {formatRupiah(grossProfit)} ({actualMarginPct}% Margin)
            </span>
          </div>
        </div>

        {/* Apply Button */}
        <button
          type="button"
          onClick={() => onApplyPrice(roundedPrice)}
          className="w-full py-2 rounded-xl bg-pink-100 hover:bg-pink-200/80 text-[#be185d] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Terapkan Harga {formatRupiah(roundedPrice)} ke Harga Jual</span>
        </button>
      </div>
    </div>
  );
};
