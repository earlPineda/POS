import React, { useState } from 'react';
import { Order } from '../types/pos';
import { AlertTriangle, CheckCircle, Clock, Coffee, Eye, Filter, Minus, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';

interface KDSViewProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: 'completed' | 'preparing' | 'ready' | 'refunded') => void;
  onViewReceipt: (order: Order) => void;
  /** Apply edits made in the KDS order editor (customer, type, items). */
  onEditOrder: (order: Order) => void;
  /** Soft-delete: remove from the KDS dashboard only — the sale stays counted in Reports. */
  onDeleteOrder: (orderId: string) => void;
}

export const KDSView: React.FC<KDSViewProps> = ({
  orders,
  onUpdateOrderStatus,
  onViewReceipt,
  onEditOrder,
  onDeleteOrder,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Order editor / delete confirmation state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);

  // Orders deleted from the dashboard are hidden here but remain in Reports
  const visibleOrders = orders.filter((o) => !o.hiddenFromKDS);

  const filteredOrders = visibleOrders.filter((o) => {
    if (filterStatus === 'all') return true;
    return o.status === filterStatus;
  });

  // Recompute order financials from its (possibly edited) item list
  const computeOrderTotals = (order: Order) => {
    const subtotal = order.items.reduce((sum, i) => sum + i.itemTotal, 0);
    const discountAmount =
      order.discountType === 'promo'
        ? Math.min(subtotal, 50)
        : subtotal * (order.discountPercent / 100);
    const discounted = subtotal - discountAmount;
    const vatAmount = discounted * order.vatRate;
    const total = discounted + vatAmount;
    const totalCost = order.items.reduce((sum, i) => sum + i.itemCostTotal, 0);
    return {
      subtotal,
      discountAmount,
      vatAmount,
      total,
      totalCost,
      netProfit: total - totalCost,
    };
  };

  const editingTotals = editingOrder ? computeOrderTotals(editingOrder) : null;

  const changeItemQty = (index: number, delta: number) => {
    setEditingOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it, i) => {
          if (i !== index) return it;
          const quantity = Math.max(1, it.quantity + delta);
          return {
            ...it,
            quantity,
            itemTotal: it.unitPrice * quantity,
            itemCostTotal: it.unitCost * quantity,
          };
        }),
      };
    });
  };

  const removeEditingItem = (index: number) => {
    setEditingOrder((prev) =>
      prev ? { ...prev, items: prev.items.filter((_, i) => i !== index) } : prev
    );
  };

  const saveEditedOrder = () => {
    if (!editingOrder || editingOrder.items.length === 0) return;
    onEditOrder({ ...editingOrder, ...computeOrderTotals(editingOrder) });
    setEditingOrder(null);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 lg:pb-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
            <Coffee className="w-5 h-5 text-emerald-700" />
            <span>Kitchen Display System (KDS) & Order Log</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
            Real-time drink assembly tickets for baristas and historical transaction auditing
          </p>
        </div>

        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg overflow-x-auto no-scrollbar touch-scroll max-w-full">
          {['all', 'preparing', 'ready', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize whitespace-nowrap transition-colors cursor-pointer ${
                filterStatus === status ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-16 text-center text-stone-400 bg-white rounded-xl border border-stone-200">
            <Coffee className="w-10 h-10 mx-auto mb-2 text-stone-300 stroke-1" />
            <p className="text-sm font-semibold text-stone-700">No orders found</p>
            <p className="text-xs text-stone-400 mt-0.5">Tickets will appear here when rung up at the register</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isCompleted = order.status === 'completed';
            const isReady = order.status === 'ready';

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-emerald-400">{order.orderNumber}</div>
                    <div className="text-xs font-semibold">{order.customerName}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase bg-stone-800 px-2 py-0.5 rounded text-stone-300">
                      {order.orderType}
                    </span>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Items Ticket */}
                <div className="p-4 space-y-3 flex-1 divide-y divide-stone-100">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="pt-2 first:pt-0">
                      <div className="flex justify-between items-baseline text-xs font-bold text-stone-900">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-mono text-[11px] text-stone-500">{item.size}</span>
                      </div>
                      <div className="text-[11px] text-stone-600 pl-3 mt-0.5 space-y-0.5">
                        <div>{item.customization.iceLevel} · {item.customization.sweetness}</div>
                        {item.customization.milkType !== 'Full Cream Milk' && (
                          <div className="text-emerald-800 font-semibold">{item.customization.milkType}</div>
                        )}
                        {(item.customization.addOns ?? []).map((addOn) => (
                          <div key={addOn.id} className="text-emerald-800 font-semibold">
                            + {addOn.label}
                          </div>
                        ))}
                        {item.customization.notes && (
                          <div className="italic text-stone-700">Note: {item.customization.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Footer & Actions */}
                <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
                  <div className="font-mono text-xs">
                    <div className="text-[10px] text-stone-400">Total Tendered</div>
                    <div className="font-bold text-stone-900">₱{order.total.toFixed(2)}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onViewReceipt(order)}
                      className="p-2 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg text-xs"
                      title="View Thermal Receipt"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        setEditingOrder({ ...order, items: order.items.map((it) => ({ ...it })) })
                      }
                      className="p-2 text-stone-600 hover:text-emerald-700 bg-white border border-stone-200 rounded-lg text-xs"
                      title="Edit Order"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeletingOrder(order)}
                      className="p-2 text-rose-600 hover:text-rose-800 bg-white border border-stone-200 rounded-lg text-xs"
                      title="Remove from dashboard (sale stays in reports)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {!isCompleted && !isReady && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'ready')}
                        className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Ready</span>
                      </button>
                    )}

                    {!isCompleted && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </button>
                    )}

                    {isCompleted && (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Order Edit Modal (KDS) */}
      {editingOrder && editingTotals && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-stone-200 max-w-lg w-full max-h-[92dvh] flex flex-col overflow-hidden my-auto animate-in slide-in-from-bottom duration-200">
            <div className="px-4 sm:px-5 py-3 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {editingOrder.orderNumber}
                </div>
                <h3 className="text-sm font-semibold">Edit Order</h3>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={editingOrder.customerName}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, customerName: e.target.value })
                    }
                    className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Order Type
                  </label>
                  <select
                    value={editingOrder.orderType}
                    onChange={(e) =>
                      setEditingOrder({
                        ...editingOrder,
                        orderType: e.target.value as Order['orderType'],
                      })
                    }
                    className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {(['Dine-In', 'Takeout', 'Delivery'] as const).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Items</label>
                <div className="space-y-2">
                  {editingOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 border border-stone-200 rounded-lg bg-stone-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-stone-900 truncate">
                          {item.name} ({item.size})
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          ₱{item.unitPrice.toFixed(2)} each
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => changeItemQty(idx, -1)}
                          className="p-1.5 rounded border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-xs font-mono font-bold text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => changeItemQty(idx, 1)}
                          className="p-1.5 rounded border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="w-16 text-right text-xs font-mono font-bold text-stone-900">
                        ₱{item.itemTotal.toFixed(2)}
                      </div>
                      <button
                        onClick={() => removeEditingItem(idx)}
                        className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-1 text-xs font-mono">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span>₱{editingTotals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Discount</span>
                  <span>-₱{editingTotals.discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>VAT</span>
                  <span>₱{editingTotals.vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 border-t border-stone-200 pt-1">
                  <span>TOTAL</span>
                  <span>₱{editingTotals.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Food Cost</span>
                  <span>₱{editingTotals.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Net Profit</span>
                  <span>₱{editingTotals.netProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-stone-500">
                {editingOrder.items.length} item(s)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedOrder}
                  disabled={editingOrder.items.length === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation (dashboard only — sale stays in reports) */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-stone-200 max-w-md w-full p-4 sm:p-6 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-sm text-stone-900">
                Remove {deletingOrder.orderNumber}?
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              This order will be removed from the <strong>Orders &amp; KDS dashboard</strong>. Its
              sale stays counted in <strong>Store Performance &amp; Reports</strong>.
            </p>
            <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => setDeletingOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteOrder(deletingOrder.id);
                  setDeletingOrder(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                Remove Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
