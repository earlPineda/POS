import React from 'react';
import { Order } from '../types/pos';
import { CheckCircle2, Download, Printer, X } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReceipt = () => {
    const textReceipt = `
========================================
        MATCHA AVENUE CAFÉ & CO.
  @matchaavenuecafe · Artisanal Kyoto Teas
========================================
Branch: ${order.locationName}
Date: ${new Date(order.createdAt).toLocaleString()}
Invoice / Order #: ${order.orderNumber}
Type: ${order.orderType}
Customer: ${order.customerName}
Cashier: ${order.cashierName}
----------------------------------------
ITEMS:
${order.items
  .map(
    (item) =>
      `${item.quantity}x ${item.name} (${item.size})
   @ ₱${item.unitPrice.toFixed(2)} = ₱${item.itemTotal.toFixed(2)}
   ${item.customization.iceLevel}, ${item.customization.sweetness}
   ${item.customization.milkType !== 'Full Cream Milk' ? item.customization.milkType : ''}${(item.customization.addOns ?? []).map((a) => `, +${a.label} (₱${a.price.toFixed(2)})`).join('')}`
  )
  .join('\n')}
----------------------------------------
Subtotal:              ₱${order.subtotal.toFixed(2)}
Discounts (${order.discountType}): -₱${order.discountAmount.toFixed(2)}
VAT (${(order.vatRate * 100).toFixed(0)}%):                 ₱${order.vatAmount.toFixed(2)}
TOTAL AMOUNT DUE:      ₱${order.total.toFixed(2)}
----------------------------------------
PAYMENT: ${order.payment.method.toUpperCase()}
${order.payment.tendered ? `Tendered: ₱${order.payment.tendered.toFixed(2)}\nChange: ₱${(order.payment.change || 0).toFixed(2)}` : ''}
${order.payment.referenceNo ? `Ref No: ${order.payment.referenceNo}` : ''}
${order.payment.cardLast4 ? `Card ending in: **** ${order.payment.cardLast4}` : ''}
========================================
   Thank you for drinking pure matcha!
   Please present this slip at pickup.
========================================
`;

    const blob = new Blob([textReceipt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt_${order.orderNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/80 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-stone-200 max-w-sm w-full max-h-[92dvh] flex flex-col overflow-hidden my-auto animate-in slide-in-from-bottom duration-200">
        {/* Top Action Ribbon */}
        <div className="p-3.5 sm:p-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <div>
              <div className="text-xs font-bold">Transaction Finalized</div>
              <div className="text-[10px] text-emerald-200 font-mono">{order.orderNumber}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realistic Thermal Receipt Body */}
        <div id="printable-receipt" className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 bg-stone-50 font-mono text-[11px] text-stone-800 leading-tight space-y-3">
          {/* Cafe Header */}
          <div className="text-center pb-2 border-b border-dashed border-stone-300 space-y-1">
            <div className="text-sm font-bold tracking-wider text-stone-900 font-sans">
              MATCHA AVENUE CAFÉ
            </div>
            <div className="text-[10px] text-stone-500">@matchaavenuecafe · Kyoto Beverage Co.</div>
            <div className="text-[10px] text-stone-500">{order.locationName}</div>
            <div className="text-[10px] text-stone-400">TIN: 402-991-382-000 NV</div>
            <div className="text-[10px] text-stone-400">SN: POS-MA-2026-BGC01</div>
          </div>

          {/* Transaction Metadata */}
          <div className="space-y-0.5 text-stone-600 text-[10px]">
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span>Invoice #:</span>
              <span className="font-bold text-stone-900">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Order Type:</span>
              <span className="uppercase font-semibold">{order.orderType}</span>
            </div>
            <div className="flex justify-between">
              <span>Guest:</span>
              <span>{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{order.cashierName}</span>
            </div>
          </div>

          {/* Itemized Line Items */}
          <div className="border-t border-b border-dashed border-stone-300 py-2 space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between font-bold text-stone-900">
                  <span>{item.quantity}x {item.name} ({item.size})</span>
                  <span>₱{item.itemTotal.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-stone-500 pl-2">
                  {item.customization.iceLevel} · {item.customization.sweetness}
                  {item.customization.milkType !== 'Full Cream Milk' && ` · ${item.customization.milkType}`}
                  {(item.customization.addOns ?? []).map((addOn) => ` · +${addOn.label}`)}
                </div>
              </div>
            ))}
          </div>

          {/* Financial Totals */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₱{order.subtotal.toFixed(2)}</span>
            </div>

            {order.discountAmount > 0 && (
              <div className="flex justify-between text-stone-700">
                <span>Discount ({order.discountType}):</span>
                <span>-₱{order.discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>VAT ({(order.vatRate * 100).toFixed(0)}%):</span>
              <span>₱{order.vatAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm font-extrabold text-stone-900 pt-1 border-t border-stone-400">
              <span>TOTAL DUE:</span>
              <span>₱{order.total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-stone-600 pt-1">
              <span>Payment ({order.payment.method.toUpperCase()}):</span>
              <span>₱{order.total.toFixed(2)}</span>
            </div>

            {order.payment.tendered && (
              <>
                <div className="flex justify-between text-stone-600">
                  <span>Tendered:</span>
                  <span>₱{order.payment.tendered.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-900 font-bold">
                  <span>Change:</span>
                  <span>₱{(order.payment.change || 0).toFixed(2)}</span>
                </div>
              </>
            )}

            {order.payment.referenceNo && (
              <div className="text-[10px] text-stone-500 truncate">
                Ref: {order.payment.referenceNo}
              </div>
            )}
          </div>

          {/* Barcode representation */}
          <div className="text-center pt-3 border-t border-dashed border-stone-300">
            <div className="flex justify-center gap-0.5 h-8 items-end mb-1">
              {[2, 4, 1, 3, 5, 2, 6, 2, 1, 4, 3, 2, 5, 1, 3, 4, 2, 6, 1, 3, 2].map((w, i) => (
                <div
                  key={i}
                  style={{ width: `${w}px` }}
                  className="bg-stone-900 h-full"
                />
              ))}
            </div>
            <div className="text-[9px] text-stone-400 tracking-widest">{order.id}</div>
            <div className="text-[10px] text-stone-500 mt-2 font-sans font-medium">
              Thank you for visiting Matcha Avenue Café!
            </div>
          </div>
        </div>

        {/* Modal Controls (Sticky Bottom) */}
        <div className="p-3 sm:p-4 bg-white border-t border-stone-200 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={handleDownloadReceipt}
            className="flex-1 py-2 px-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-2 px-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer text-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
