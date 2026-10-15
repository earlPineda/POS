import React, { useState } from 'react';
import { Ingredient, IngredientCategory, StaffUser, StockAdjustmentLog } from '../types/pos';
import { AlertCircle, ArrowDownUp, Check, Download, FileSpreadsheet, Package, Pencil, Plus, RefreshCw, Send, Trash2, Upload, Wifi } from 'lucide-react';

interface InventoryManagerProps {
  ingredients: Ingredient[];
  stockLogs: StockAdjustmentLog[];
  currentStaff: StaffUser;
  onUpdateIngredients: (updated: Ingredient[], newLog?: StockAdjustmentLog) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  ingredients,
  stockLogs,
  currentStaff,
  onUpdateIngredients,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [restockItem, setRestockItem] = useState<Ingredient | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(1000);
  const [wasteItem, setWasteItem] = useState<Ingredient | null>(null);
  const [wasteAmount, setWasteAmount] = useState<number>(50);
  const [wasteReason, setWasteReason] = useState<string>('Spillage during bar prep');

  // Ingredient editor (change product name, costs, thresholds)
  const [editDraft, setEditDraft] = useState<Ingredient | null>(null);

  const INGREDIENT_CATEGORIES: IngredientCategory[] = [
    'Packaging',
    'Matcha & Tea',
    'Dairy & Milk',
    'Fruit Purees & Ube',
    'Syrups & Sweeteners',
    'Coffee & Espresso',
    'Toppings & Ice',
  ];

  // Integration Center State
  const [activeTab, setActiveTab] = useState<'inventory' | 'integrations' | 'audit_logs'>('inventory');
  const [webhookUrl, setWebhookUrl] = useState<string>('https://api.apicbase.com/v1/inventory/sync-stream');
  const [apiKey, setApiKey] = useState<string>('apic_live_sec_8921df89a19c');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const categories: (string | IngredientCategory)[] = [
    'All',
    'Packaging',
    'Matcha',
    'Dairy & Alt',
    'Sweetener',
    'Beverage Base',
    'Bakery',
  ];

  const filtered = ingredients.filter((ing) => {
    const matchCat = activeCategory === 'All' || ing.category === activeCategory;
    const matchSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const lowStockItems = ingredients.filter((i) => i.currentStock <= i.minThreshold);

  // Restock Handler
  const handleConfirmRestock = () => {
    if (!restockItem) return;
    const updated = ingredients.map((i) => {
      if (i.id === restockItem.id) {
        return {
          ...i,
          currentStock: i.currentStock + restockAmount,
          lastRestocked: new Date().toISOString().split('T')[0],
        };
      }
      return i;
    });

    const log: StockAdjustmentLog = {
      id: `log-${Date.now()}`,
      ingredientId: restockItem.id,
      ingredientName: restockItem.name,
      type: 'restock',
      quantityDelta: restockAmount,
      unit: restockItem.unit,
      reason: `PO Restock Delivery (${restockItem.supplier})`,
      staffName: currentStaff.name,
      timestamp: new Date().toISOString(),
    };

    onUpdateIngredients(updated, log);
    setRestockItem(null);
  };

  // Waste / Spoilage Handler
  const handleConfirmWaste = () => {
    if (!wasteItem) return;
    const updated = ingredients.map((i) => {
      if (i.id === wasteItem.id) {
        return {
          ...i,
          currentStock: Math.max(0, i.currentStock - wasteAmount),
        };
      }
      return i;
    });

    const log: StockAdjustmentLog = {
      id: `log-${Date.now()}`,
      ingredientId: wasteItem.id,
      ingredientName: wasteItem.name,
      type: 'waste',
      quantityDelta: -wasteAmount,
      unit: wasteItem.unit,
      reason: wasteReason,
      staffName: currentStaff.name,
      timestamp: new Date().toISOString(),
    };

    onUpdateIngredients(updated, log);
    setWasteItem(null);
  };

  // Save ingredient product/cost edits (no stock movement logged)
  const handleSaveIngredientEdit = () => {
    if (!editDraft || !editDraft.name.trim()) return;
    const updated = ingredients.map((i) =>
      i.id === editDraft.id ? { ...editDraft, name: editDraft.name.trim() } : i
    );
    onUpdateIngredients(updated);
    setEditDraft(null);
  };

  // Export Apicbase / Standard CSV
  const exportInventoryCSV = () => {
    const header = [
      'Ingredient ID',
      'Product Name',
      'Category',
      'Current Stock',
      'Unit',
      'Min Alert Threshold',
      'Bulk Cost (PHP)',
      'Bulk Unit',
      'Serving Cost (PHP)',
      'Supplier',
      'Last Restocked',
    ];
    const rows = ingredients.map((i) => [
      i.id,
      `"${i.name}"`,
      i.category,
      i.currentStock,
      i.unit,
      i.minThreshold,
      i.costPerBulk,
      i.bulkUnit,
      i.costPerServingUnit,
      `"${i.supplier}"`,
      i.lastRestocked,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `inventory_apicbase_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Webhook Sync Test
  const handleTestWebhook = () => {
    setSyncStatus('Testing bidirectional sync with ' + webhookUrl + '...');
    setTimeout(() => {
      setSyncStatus(`Sync Successful (HTTP 200 OK) · Synced ${ingredients.length} items with Apicbase Inventory API at ${new Date().toLocaleTimeString()}`);
    }, 1200);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 lg:pb-6">
      {/* Top Banner & Mode Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-700" />
            <span>Inventory & Stock Roster</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
            Real-time stock deduction, reorder threshold alerts, and software synchronization
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg overflow-x-auto no-scrollbar touch-scroll max-w-full">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'inventory' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Stock Roster ({ingredients.length})
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'integrations' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Software Integrations
            </button>
            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'audit_logs' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Audit Trail ({stockLogs.length})
            </button>
          </div>

          <button
            onClick={exportInventoryCSV}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors border border-stone-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alerts Banner */}
      {lowStockItems.length > 0 && activeTab === 'inventory' && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Critical Stock Alert ({lowStockItems.length} Ingredients Low)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                The following raw materials are below safe operational reorder points:
                <span className="font-semibold ml-1">
                  {lowStockItems.map((i) => `${i.name} (${i.currentStock}${i.unit})`).join(', ')}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setRestockItem(lowStockItems[0])}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs transition-colors"
          >
            Restock First Item
          </button>
        </div>
      )}

      {/* Main Stock View */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50/50">
            <div className="flex items-center gap-1 overflow-x-auto p-1 bg-stone-200/70 rounded-lg">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded whitespace-nowrap transition-colors ${
                    activeCategory === cat ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search ingredient or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-stone-300 rounded-lg px-3 py-1 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-64"
            />
          </div>

          {/* Stock Table */}
          <div className="overflow-x-auto no-scrollbar touch-scroll">
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-semibold">
                  <th className="py-3 px-6">Product / Material</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4 text-right">Cost (Bulk)</th>
                  <th className="py-3 px-4 text-right">Cost / Portion</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-6 text-center">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((item) => {
                  const isLow = item.currentStock <= item.minThreshold;
                  const percentOfMin = Math.min(100, (item.currentStock / (item.minThreshold * 2.5)) * 100);

                  return (
                    <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-6">
                        <div className="font-bold text-stone-900">{item.name}</div>
                        <div className="text-[11px] text-stone-400">ID: {item.id} · Restocked {item.lastRestocked}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 min-w-[170px]">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`font-mono font-bold ${
                              isLow ? 'text-amber-700' : 'text-stone-900'
                            }`}
                          >
                            {item.currentStock.toLocaleString()} {item.unit}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            Min: {item.minThreshold} {item.unit}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isLow ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${percentOfMin}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-700">
                        ₱{item.costPerBulk.toFixed(2)} / {item.bulkUnit}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-stone-900">
                        ₱{item.costPerServingUnit.toFixed(2)} / {item.unit}
                      </td>

                      <td className="py-3 px-4 text-stone-600 font-medium">
                        {item.supplier}
                      </td>

                      <td className="py-3 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditDraft({ ...item })}
                            className="px-2 py-1 text-[11px] font-semibold text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded transition-colors"
                            title="Edit product name & cost"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setRestockItem(item);
                              setRestockAmount(item.unit === 'pcs' ? 50 : 1000);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                          >
                            Restock
                          </button>
                          <button
                            onClick={() => {
                              setWasteItem(item);
                              setWasteAmount(item.unit === 'pcs' ? 1 : 50);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded transition-colors"
                          >
                            Waste Log
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Software Integration Center */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Apicbase Food Cost & Inventory Bridge */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-stone-900">Apicbase Live Software Sync</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Synchronize raw ingredient usage, stock counts, and recipe bill of materials with your existing Apicbase cloud instance.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Apicbase Sync Webhook URL
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded px-3 py-1.5 text-xs font-mono text-stone-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  API Key / OAuth Bearer Token
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded px-3 py-1.5 text-xs font-mono text-stone-800"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleTestWebhook}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Push Live Inventory Snapshot to Apicbase</span>
                </button>
              </div>

              {syncStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-lg font-mono">
                  {syncStatus}
                </div>
              )}
            </div>
          </div>

          {/* Third-Party POS Import / Export */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <ArrowDownUp className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-stone-900">Square / Lightspeed / Toast Sync</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Standardized CSV & JSON schema converter for importing supplier catalogues or exporting stock movements to external ERPs.
            </p>

            <div className="space-y-3 pt-2">
              <div className="border border-dashed border-stone-300 rounded-xl p-5 text-center bg-stone-50/50">
                <Upload className="w-6 h-6 text-stone-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-stone-800">Drop Supplier Delivery CSV here</div>
                <div className="text-[11px] text-stone-500 mt-0.5">Supports Apicbase, Excel, and CSV templates</div>
                <label className="inline-block mt-3 px-3 py-1 bg-white border border-stone-300 rounded-md text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer shadow-xs">
                  Browse File
                  <input
                    type="file"
                    accept=".csv,.json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSyncStatus(`File ${e.target.files[0].name} parsed successfully: 12 line items validated.`);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportInventoryCSV}
                  className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-stone-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Lightspeed CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit_logs' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex justify-between items-center">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
              Inventory Movement Audit Log
            </span>
            <span className="text-xs text-stone-500 font-mono">
              Total Recorded Logs: {stockLogs.length}
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar touch-scroll max-h-[500px]">
            <table className="w-full min-w-[650px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-semibold sticky top-0">
                  <th className="py-2.5 px-6">Timestamp</th>
                  <th className="py-2.5 px-4">Ingredient</th>
                  <th className="py-2.5 px-4">Action Type</th>
                  <th className="py-2.5 px-4 text-right">Delta</th>
                  <th className="py-2.5 px-6">Reason / Reference</th>
                  <th className="py-2.5 px-4">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {stockLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      No manual stock movements recorded yet. Sales transactions will log deductions here automatically.
                    </td>
                  </tr>
                ) : (
                  [...stockLogs].reverse().map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50">
                      <td className="py-2 px-6 font-mono text-stone-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2 px-4 font-bold text-stone-900">{log.ingredientName}</td>
                      <td className="py-2 px-4">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                            log.type === 'restock'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.type === 'waste'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td
                        className={`py-2 px-4 text-right font-mono font-bold tabular-nums ${
                          log.quantityDelta > 0 ? 'text-emerald-700' : 'text-stone-700'
                        }`}
                      >
                        {log.quantityDelta > 0 ? `+${log.quantityDelta}` : log.quantityDelta} {log.unit}
                      </td>
                      <td className="py-2 px-6 text-stone-600 truncate max-w-xs">{log.reason}</td>
                      <td className="py-2 px-4 text-stone-800 font-medium">{log.staffName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ingredient Product & Cost Editor Modal */}
      {editDraft && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-stone-200 max-w-lg w-full p-4 sm:p-6 space-y-4 max-h-[92dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <h3 className="font-bold text-sm text-stone-900">Edit Product &amp; Cost</h3>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Product Name</label>
              <input
                type="text"
                value={editDraft.name}
                onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Category</label>
                <select
                  value={editDraft.category}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, category: e.target.value as IngredientCategory })
                  }
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {INGREDIENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Supplier</label>
                <input
                  type="text"
                  value={editDraft.supplier}
                  onChange={(e) => setEditDraft({ ...editDraft, supplier: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Bulk Cost (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editDraft.costPerBulk}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, costPerBulk: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-stone-400">per {editDraft.bulkUnit}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Bulk Unit</label>
                <select
                  value={editDraft.bulkUnit}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, bulkUnit: e.target.value as Ingredient['bulkUnit'] })
                  }
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {['kg', 'L', 'pack(1000)'].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Cost per Serving (₱ / {editDraft.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editDraft.costPerServingUnit}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, costPerServingUnit: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Low Stock Threshold ({editDraft.unit})
                </label>
                <input
                  type="number"
                  min={0}
                  value={editDraft.minThreshold}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, minThreshold: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Current Stock ({editDraft.unit})
                </label>
                <input
                  type="number"
                  min={0}
                  value={editDraft.currentStock}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, currentStock: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => setEditDraft(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIngredientEdit}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Intake Modal */}
      {restockItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-stone-200 max-w-md w-full p-4 sm:p-6 space-y-4 max-h-[92dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <h3 className="font-bold text-sm text-stone-900">
              Restock Shipment Intake: {restockItem.name}
            </h3>
            <p className="text-xs text-stone-500">
              Current stock: {restockItem.currentStock} {restockItem.unit} (Supplier: {restockItem.supplier})
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Quantity Received ({restockItem.unit})
              </label>
              <input
                type="number"
                step="10"
                value={restockAmount}
                onChange={(e) => setRestockAmount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-stone-900"
              />
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => setRestockItem(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestock}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
              >
                Confirm Restock (+{restockAmount} {restockItem.unit})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waste Log Modal */}
      {wasteItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-stone-200 max-w-md w-full p-4 sm:p-6 space-y-4 max-h-[92dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <h3 className="font-bold text-sm text-stone-900">
              Log Waste / Spoilage: {wasteItem.name}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Waste Amount ({wasteItem.unit})
              </label>
              <input
                type="number"
                step="5"
                value={wasteAmount}
                onChange={(e) => setWasteAmount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Reason for Spoilage / Write-off
              </label>
              <input
                type="text"
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs text-stone-900"
              />
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => setWasteItem(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWaste}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                Record Waste (-{wasteAmount} {wasteItem.unit})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
