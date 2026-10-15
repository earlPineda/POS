import React, { useState } from 'react';
import { PaymentDetails, PaymentMethod } from '../types/pos';
import { Banknote, CreditCard, QrCode, Smartphone, X } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onCompletePayment: (payment: PaymentDetails) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  onCompletePayment,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');

  // Cash state
  const [tenderedAmount, setTenderedAmount] = useState<number>(totalAmount);

  // E-wallet (GCash / Maya) state
  const [referenceNumber, setReferenceNumber] = useState<string>(
    `REF-${Date.now().toString().slice(-6)}`
  );

  // Card state
  const [cardLast4, setCardLast4] = useState<string>('4082');
  const [cardAuthCode, setCardAuthCode] = useState<string>(
    `AUTH-${Math.floor(100000 + Math.random() * 900000)}`
  );

  if (!isOpen) return null;

  const changeDue = Math.max(0, tenderedAmount - totalAmount);
  const isCashSufficient = tenderedAmount >= totalAmount;

  const handleQuickCash = (amount: number) => {
    setTenderedAmount(amount);
  };

  const handleFinalize = () => {
    const details: PaymentDetails = {
      method: selectedMethod,
      paidAt: new Date().toISOString(),
    };

    if (selectedMethod === 'cash') {
      if (!isCashSufficient) return;
      details.tendered = tenderedAmount;
      details.change = changeDue;
    } else if (selectedMethod === 'gcash' || selectedMethod === 'maya') {
      details.referenceNo = referenceNumber;
    } else if (selectedMethod === 'card') {
      details.cardLast4 = cardLast4;
      details.cardAuthCode = cardAuthCode;
    }

    onCompletePayment(details);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/75 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-stone-200 max-w-xl w-full max-h-[92dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-sm tracking-tight">Select Payment Tender</h3>
            <p className="text-xs text-stone-400">Total Due: ₱{totalAmount.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Payment Method Tabs */}
        <div className="grid grid-cols-4 p-1.5 sm:p-2 bg-stone-100 border-b border-stone-200 gap-1 shrink-0">
          <button
            onClick={() => setSelectedMethod('cash')}
            className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              selectedMethod === 'cash'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Cash</span>
          </button>

          <button
            onClick={() => {
              setSelectedMethod('gcash');
              setReferenceNumber(`GCASH-${Date.now().toString().slice(-7)}`);
            }}
            className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              selectedMethod === 'gcash'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>GCash</span>
          </button>

          <button
            onClick={() => {
              setSelectedMethod('maya');
              setReferenceNumber(`MAYA-${Date.now().toString().slice(-7)}`);
            }}
            className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              selectedMethod === 'maya'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Maya QR</span>
          </button>

          <button
            onClick={() => setSelectedMethod('card')}
            className={`py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              selectedMethod === 'card'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Card POS</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-3.5 sm:p-6 flex-1 overflow-y-auto overscroll-contain space-y-4">
          {selectedMethod === 'cash' && (
            <div className="space-y-4">
              <div className="bg-stone-50 p-3.5 sm:p-4 rounded-xl border border-stone-200">
                <div className="flex justify-between items-center mb-1 text-xs text-stone-500">
                  <span>Payable Amount</span>
                  <span className="font-mono text-sm font-bold text-stone-900">₱{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-3 text-xs text-stone-700">
                  <span className="font-semibold">Cash Tendered</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs">₱</span>
                    <input
                      type="number"
                      step="10"
                      value={tenderedAmount}
                      onChange={(e) => setTenderedAmount(Number(e.target.value))}
                      className="w-28 sm:w-32 bg-white border border-stone-300 rounded px-2.5 py-1 text-base font-bold text-stone-900 font-mono text-right focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-700 uppercase">Change Due</span>
                  <span
                    className={`text-xl font-extrabold font-mono tabular-nums ${
                      isCashSufficient ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    ₱{changeDue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Quick Cash Buttons - 2 cols on mobile, 4 on desktop */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase mb-2">
                  Quick Tender Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <button
                    onClick={() => handleQuickCash(totalAmount)}
                    className="py-2.5 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-900 font-bold text-xs rounded-lg transition-all border border-stone-200 cursor-pointer"
                  >
                    Exact (₱{totalAmount.toFixed(0)})
                  </button>
                  {[200, 500, 1000].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleQuickCash(val)}
                      className={`py-2.5 text-xs font-bold rounded-lg transition-all active:scale-95 border cursor-pointer ${
                        tenderedAmount === val
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-900 border-stone-200'
                      }`}
                    >
                      ₱{val}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GCash View */}
          {selectedMethod === 'gcash' && (
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 bg-blue-50/50 rounded-xl border border-blue-200">
              <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white p-2 rounded-xl border-2 border-blue-500 flex flex-col items-center justify-center shrink-0 shadow-xs">
                <div className="w-full h-full bg-stone-900 rounded-sm p-2 flex items-center justify-center text-white">
                  <QrCode className="w-20 h-20 sm:w-24 sm:h-24 text-white" />
                </div>
              </div>

              <div className="space-y-2 flex-1 text-xs w-full text-center sm:text-left">
                <div className="inline-block bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase">
                  GCash Merchant QR
                </div>
                <div className="font-bold text-stone-900 text-sm">
                  Matcha Avenue Café Inc.
                </div>
                <p className="text-stone-600 text-[11px] sm:text-xs">
                  Scan with GCash App and verify amount ₱{totalAmount.toFixed(2)}.
                </p>
                <div className="pt-2 text-left">
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    GCash Reference Number
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded px-2.5 py-1 text-xs font-mono font-bold text-stone-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Maya View */}
          {selectedMethod === 'maya' && (
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
              <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white p-2 rounded-xl border-2 border-emerald-500 flex flex-col items-center justify-center shrink-0 shadow-xs">
                <div className="w-full h-full bg-stone-900 rounded-sm p-2 flex items-center justify-center text-white">
                  <QrCode className="w-20 h-20 sm:w-24 sm:h-24 text-emerald-400" />
                </div>
              </div>

              <div className="space-y-2 flex-1 text-xs w-full text-center sm:text-left">
                <div className="inline-block bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase">
                  Maya QR Ph Registered
                </div>
                <div className="font-bold text-stone-900 text-sm">
                  Matcha Avenue Beverage Corp
                </div>
                <p className="text-stone-600 text-[11px] sm:text-xs">
                  Supports Maya, BPI, BDO, UnionBank and all QR Ph apps.
                </p>
                <div className="pt-2 text-left">
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Maya Approval / Reference Code
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded px-2.5 py-1 text-xs font-mono font-bold text-stone-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Card POS View */}
          {selectedMethod === 'card' && (
            <div className="space-y-4 p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-emerald-700 shrink-0" />
                <div>
                  <div className="font-bold text-stone-900 text-sm">Smart Payment Terminal</div>
                  <div className="text-stone-500">Insert, tap, or swipe Visa, Mastercard, or JCB card</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Card Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Terminal Auth Code</label>
                  <input
                    type="text"
                    value={cardAuthCode}
                    onChange={(e) => setCardAuthCode(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Action (Sticky bottom bar) */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            onClick={handleFinalize}
            disabled={selectedMethod === 'cash' && !isCashSufficient}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all ${
              selectedMethod === 'cash' && !isCashSufficient
                ? 'bg-stone-300 cursor-not-allowed text-stone-500'
                : 'bg-emerald-700 hover:bg-emerald-800 cursor-pointer active:scale-98'
            }`}
          >
            Complete Sale & Print Receipt (₱{totalAmount.toFixed(2)})
          </button>
        </div>
      </div>
    </div>
  );
};
