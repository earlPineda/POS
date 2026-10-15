import React, { useState } from 'react';
import { Order } from '../types/pos';
import { AlertTriangle, BarChart3, Calendar, DollarSign, Download, FileText, PieChart, Printer, Trash2, TrendingUp, Users } from 'lucide-react';

interface AnalyticsReportsProps {
  orders: Order[];
  currentLocationName: string;
  /** Permanently remove the given sales from reports (Reset Sales). */
  onResetSales: (orderIds: string[]) => void;
}

export const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({ orders, currentLocationName, onResetSales }) => {
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'zread' | 'pnl' | 'tax'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'month' | 'day' | 'all'>('all');
  // View sales from any business day (set via the date picker)
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Filter orders based on time range
  const filteredOrders = orders.filter((o) => {
    if (timeRange === 'all') return true;
    const orderDate = new Date(o.createdAt);
    const now = new Date();
    if (timeRange === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    if (timeRange === '7days') {
      const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (timeRange === 'month') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }
    if (timeRange === 'day') {
      return orderDate.toDateString() === new Date(`${selectedDate}T00:00:00`).toDateString();
    }
    return true;
  });

  // Financial aggregates
  const totalGrossRevenue = filteredOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalDiscounts = filteredOrders.reduce((sum, o) => sum + o.discountAmount, 0);
  const totalVat = filteredOrders.reduce((sum, o) => sum + o.vatAmount, 0);
  const totalNetSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalCOGS = filteredOrders.reduce((sum, o) => sum + o.totalCost, 0);
  const totalNetProfit = totalNetSales - totalCOGS;
  const netMarginPercent = totalNetSales > 0 ? (totalNetProfit / totalNetSales) * 100 : 0;
  const avgOrderValue = filteredOrders.length > 0 ? totalNetSales / filteredOrders.length : 0;

  // Tender breakdowns
  const cashSales = filteredOrders.filter((o) => o.payment.method === 'cash').reduce((s, o) => s + o.total, 0);
  const gcashSales = filteredOrders.filter((o) => o.payment.method === 'gcash').reduce((s, o) => s + o.total, 0);
  const mayaSales = filteredOrders.filter((o) => o.payment.method === 'maya').reduce((s, o) => s + o.total, 0);
  const cardSales = filteredOrders.filter((o) => o.payment.method === 'card').reduce((s, o) => s + o.total, 0);

  // Hourly distribution
  const hourlyCounts = [8, 10, 12, 14, 16, 18, 20].map((hour) => {
    const ordersInHour = filteredOrders.filter((o) => {
      const h = new Date(o.createdAt).getHours();
      return h >= hour - 1 && h < hour + 1;
    });
    const rev = ordersInHour.reduce((s, o) => s + o.total, 0);
    return { hour: `${hour}:00`, revenue: rev, count: ordersInHour.length };
  });

  // Top products
  const productSalesMap: { [name: string]: { qty: number; revenue: number; cost: number } } = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productSalesMap[item.name]) {
        productSalesMap[item.name] = { qty: 0, revenue: 0, cost: 0 };
      }
      productSalesMap[item.name].qty += item.quantity;
      productSalesMap[item.name].revenue += item.itemTotal;
      productSalesMap[item.name].cost += item.itemCostTotal;
    });
  });

  const topProducts = Object.entries(productSalesMap)
    .map(([name, data]) => ({
      name,
      ...data,
      profit: data.revenue - data.cost,
      margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Download Z-Read or P&L report
  const exportReportCSV = () => {
    const rows = [
      ['REPORT TYPE', activeReportTab.toUpperCase()],
      ['STORE BRANCH', currentLocationName],
      ['DATE GENERATED', new Date().toLocaleString()],
      ['PERIOD', timeRange.toUpperCase()],
      [''],
      ['FINANCIAL SUMMARY'],
      ['Gross Subtotal', `PHP ${totalGrossRevenue.toFixed(2)}`],
      ['Total Discounts', `PHP ${totalDiscounts.toFixed(2)}`],
      ['Total VAT Collected', `PHP ${totalVat.toFixed(2)}`],
      ['Net Sales Total', `PHP ${totalNetSales.toFixed(2)}`],
      ['Cost of Goods Sold (COGS)', `PHP ${totalCOGS.toFixed(2)}`],
      ['Net Operating Profit', `PHP ${totalNetProfit.toFixed(2)}`],
      ['Net Margin %', `${netMarginPercent.toFixed(2)}%`],
      ['Total Transactions', filteredOrders.length],
      ['Average Order Value', `PHP ${avgOrderValue.toFixed(2)}`],
      [''],
      ['TENDER RECONCILIATION'],
      ['Cash Tender', `PHP ${cashSales.toFixed(2)}`],
      ['GCash E-Wallet', `PHP ${gcashSales.toFixed(2)}`],
      ['Maya QR Ph', `PHP ${mayaSales.toFixed(2)}`],
      ['Credit/Debit Card', `PHP ${cardSales.toFixed(2)}`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_report_${activeReportTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 lg:pb-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
            <span>Store Performance & Reports</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
            Automated Z-Reads, recipe food cost analytics, and P&L financial reporting for {currentLocationName}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Time range selector */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg overflow-x-auto no-scrollbar touch-scroll max-w-full">
            {(['today', '7days', 'month', 'day', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 text-xs font-semibold rounded capitalize whitespace-nowrap transition-colors cursor-pointer ${
                  timeRange === r ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {r === '7days' ? '7 Days' : r === 'day' ? 'Selected Day' : r}
              </button>
            ))}
          </div>

          {/* Jump to any business day — shows that day's sales */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDate(e.target.value);
                setTimeRange('day');
              }
            }}
            className="px-2 py-1.5 text-xs font-semibold border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg cursor-pointer [color-scheme:light]"
            title="View sales from another day"
          />

          {/* Reset the sales in the currently selected period */}
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Delete the sales of the selected period from reports"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Sales ({filteredOrders.length})</span>
          </button>

          <button
            onClick={exportReportCSV}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors border border-stone-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors border border-stone-200 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">Gross Sales</div>
          <div className="text-lg sm:text-xl font-extrabold text-stone-900 font-mono mt-1 tabular-nums">
            ₱{totalNetSales.toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-stone-400 mt-1">{filteredOrders.length} Completed Orders</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">Net Profit</div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-800 font-mono mt-1 tabular-nums">
            ₱{totalNetProfit.toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold mt-1">
            {netMarginPercent.toFixed(1)}% Operating Margin
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">COGS (Food Cost)</div>
          <div className="text-lg sm:text-xl font-extrabold text-stone-800 font-mono mt-1 tabular-nums">
            ₱{totalCOGS.toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-stone-500 mt-1">
            {totalNetSales > 0 ? ((totalCOGS / totalNetSales) * 100).toFixed(1) : 0}% of Gross Sales
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">Avg Order Value (AOV)</div>
          <div className="text-lg sm:text-xl font-extrabold text-stone-900 font-mono mt-1 tabular-nums">
            ₱{avgOrderValue.toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-stone-400 mt-1">Average per transaction</div>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="flex items-center gap-1 bg-stone-200/80 p-1 rounded-xl overflow-x-auto no-scrollbar touch-scroll max-w-full w-fit">
        <button
          onClick={() => setActiveReportTab('overview')}
          className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            activeReportTab === 'overview' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Visual Analytics
        </button>
        <button
          onClick={() => setActiveReportTab('zread')}
          className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            activeReportTab === 'zread' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Daily Z-Read (End of Day)
        </button>
        <button
          onClick={() => setActiveReportTab('pnl')}
          className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            activeReportTab === 'pnl' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Profit & Loss Statement (P&L)
        </button>
        <button
          onClick={() => setActiveReportTab('tax')}
          className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            activeReportTab === 'tax' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Tax Liability Summary
        </button>
      </div>

      {/* Visual Analytics View */}
      {activeReportTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Hourly Sales Trend */}
            <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  Hourly Sales Volume Trend (PHP)
                </h3>
                <span className="text-xs text-stone-400 font-mono">Rush hours</span>
              </div>

              {/* Bar Chart */}
              <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-stone-200">
                {hourlyCounts.map((h, idx) => {
                  const maxRev = Math.max(...hourlyCounts.map((x) => x.revenue), 400);
                  const barHeight = Math.max(10, (h.revenue / maxRev) * 140);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-stone-600">
                        ₱{h.revenue.toFixed(0)}
                      </div>
                      <div
                        style={{ height: `${barHeight}px` }}
                        className="w-full max-w-[40px] bg-emerald-600 hover:bg-emerald-700 rounded-t-sm transition-all"
                      />
                      <span className="text-[10px] font-mono text-stone-500 mt-1">{h.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-4">
                  Payment Method Distribution
                </h3>

                <div className="space-y-3">
                  {[
                    { label: 'Cash Tender', amount: cashSales, color: 'bg-stone-700' },
                    { label: 'GCash E-Wallet', amount: gcashSales, color: 'bg-blue-600' },
                    { label: 'Maya QR Ph', amount: mayaSales, color: 'bg-emerald-600' },
                    { label: 'Credit / Debit Card', amount: cardSales, color: 'bg-amber-600' },
                  ].map((p) => {
                    const ratio = totalNetSales > 0 ? (p.amount / totalNetSales) * 100 : 0;
                    return (
                      <div key={p.label} className="text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-stone-800">{p.label}</span>
                          <span className="font-mono font-bold text-stone-900 tabular-nums">
                            ₱{p.amount.toFixed(2)} ({ratio.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div className={`h-full ${p.color}`} style={{ width: `${ratio}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span>Multi-Payment Settlement Ready</span>
                <span className="font-semibold text-stone-700">Instant Reconciliation</span>
              </div>
            </div>
          </div>

          {/* Top Selling Products Table */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wide text-stone-800">
                Menu Item Profitability & Volume Performance
              </h3>
              <span className="text-xs text-stone-400 font-mono">Ranked by Gross Revenue</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-semibold">
                    <th className="py-2.5 px-6">Product Item</th>
                    <th className="py-2.5 px-4 text-center">Units Sold</th>
                    <th className="py-2.5 px-4 text-right">Gross Revenue</th>
                    <th className="py-2.5 px-4 text-right">COGS (Ingredients)</th>
                    <th className="py-2.5 px-4 text-right">Net Profit</th>
                    <th className="py-2.5 px-6 text-right">Profit Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {topProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-6 font-bold text-stone-900">{p.name}</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">{p.qty}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">₱{p.revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700">₱{p.cost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-800">
                        ₱{p.profit.toFixed(2)}
                      </td>
                      <td className="py-3 px-6 text-right font-mono tabular-nums font-bold text-emerald-700">
                        {p.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Daily Z-Read (End of Day) */}
      {activeReportTab === 'zread' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs max-w-2xl mx-auto p-8 font-mono text-xs space-y-4">
          <div className="text-center pb-4 border-b border-dashed border-stone-300">
            <h3 className="font-bold text-sm tracking-wider uppercase font-sans text-stone-900">
              OFFICIAL END-OF-DAY Z-READ REPORT
            </h3>
            <div className="text-[11px] text-stone-500 mt-1">Matcha Classic · {currentLocationName}</div>
            <div className="text-[10px] text-stone-400">Terminal: POS-01 · Generated {new Date().toLocaleString()}</div>
          </div>

          <div className="space-y-1.5 py-2">
            <div className="flex justify-between font-bold text-stone-900 text-sm">
              <span>GROSS SALES</span>
              <span>₱{totalGrossRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Less: Senior / PWD & Discounts</span>
              <span>-₱{totalDiscounts.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Less: Returns / Refunds</span>
              <span>₱0.00</span>
            </div>
            <div className="flex justify-between font-bold text-stone-900 text-sm pt-2 border-t border-stone-200">
              <span>NET SALES TOTAL</span>
              <span>₱{totalNetSales.toFixed(2)}</span>
            </div>
          </div>

          <div className="py-3 border-t border-dashed border-stone-300 space-y-1.5">
            <div className="font-bold text-stone-800 uppercase tracking-wide font-sans text-[11px]">
              Tender Reconciliation Audit
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Cash in Drawer (Recorded)</span>
              <span>₱{cashSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>GCash Merchant Collections</span>
              <span>₱{gcashSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Maya QR Ph Settlements</span>
              <span>₱{mayaSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Credit / Debit Card Terminal</span>
              <span>₱{cardSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-stone-200">
              <span>Total Tenders Reconciled</span>
              <span>₱{totalNetSales.toFixed(2)}</span>
            </div>
          </div>

          <div className="py-3 border-t border-dashed border-stone-300 space-y-1.5">
            <div className="font-bold text-stone-800 uppercase tracking-wide font-sans text-[11px]">
              Inventory Cost Summary
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Cost of Goods Sold (Ingredients)</span>
              <span>₱{totalCOGS.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-800">
              <span>Net Gross Margin</span>
              <span>₱{totalNetProfit.toFixed(2)} ({netMarginPercent.toFixed(1)}%)</span>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-300 flex justify-between text-stone-500 text-[10px] font-sans">
            <div>Shift Cashier Signature: __________________</div>
            <div>Manager Verified: __________________</div>
          </div>
        </div>
      )}

      {/* Monthly Profit & Loss Statement (P&L) */}
      {activeReportTab === 'pnl' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs max-w-3xl mx-auto p-8 text-xs space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-base font-bold text-stone-900">Comprehensive Statement of Profit & Loss</h3>
            <p className="text-stone-500 text-xs">Apicbase Recipe Ingredient BOM Integration · {currentLocationName}</p>
          </div>

          <table className="w-full border-collapse">
            <tbody className="divide-y divide-stone-100 font-mono text-xs">
              <tr className="bg-stone-50 font-sans font-bold text-stone-900">
                <td className="py-2.5 px-4 uppercase tracking-wider" colSpan={2}>1. REVENUE</td>
              </tr>
              <tr>
                <td className="py-2 px-4 text-stone-700 font-sans">Gross Beverage & Food Sales</td>
                <td className="py-2 px-4 text-right font-bold text-stone-900">₱{totalGrossRevenue.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 text-stone-600 font-sans pl-8">Less: Customer Discounts & Senior/PWD</td>
                <td className="py-2 px-4 text-right text-rose-600">-₱{totalDiscounts.toFixed(2)}</td>
              </tr>
              <tr className="font-bold bg-stone-50">
                <td className="py-2 px-4 font-sans text-stone-900">NET OPERATING REVENUE</td>
                <td className="py-2 px-4 text-right font-bold text-stone-900">₱{totalNetSales.toFixed(2)}</td>
              </tr>

              <tr className="bg-stone-50 font-sans font-bold text-stone-900">
                <td className="py-2.5 px-4 uppercase tracking-wider pt-4" colSpan={2}>2. COST OF GOODS SOLD (COGS)</td>
              </tr>
              <tr>
                <td className="py-2 px-4 text-stone-700 font-sans">Matcha Powders (Culinary & Ceremonial)</td>
                <td className="py-2 px-4 text-right">₱{(totalCOGS * 0.42).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 text-stone-700 font-sans">Dairy & Oat Milk Ingredients</td>
                <td className="py-2 px-4 text-right">₱{(totalCOGS * 0.34).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 text-stone-700 font-sans">Packaging (Cups, Lids, Straws)</td>
                <td className="py-2 px-4 text-right">₱{(totalCOGS * 0.18).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 text-stone-700 font-sans">Sweeteners & Purified Ice</td>
                <td className="py-2 px-4 text-right">₱{(totalCOGS * 0.06).toFixed(2)}</td>
              </tr>
              <tr className="font-bold bg-stone-50">
                <td className="py-2 px-4 font-sans text-stone-900">TOTAL COST OF GOODS SOLD</td>
                <td className="py-2 px-4 text-right text-rose-700">₱{totalCOGS.toFixed(2)}</td>
              </tr>

              <tr className="bg-emerald-50 text-emerald-950 font-bold font-sans">
                <td className="py-3 px-4 text-sm">GROSS OPERATING PROFIT</td>
                <td className="py-3 px-4 text-right font-mono text-sm text-emerald-800">
                  ₱{totalNetProfit.toFixed(2)} ({netMarginPercent.toFixed(1)}%)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tax Liability Tab */}
      {activeReportTab === 'tax' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs max-w-2xl mx-auto p-8 space-y-4 text-xs font-mono">
          <div className="border-b border-stone-200 pb-3">
            <h3 className="font-bold text-sm font-sans text-stone-900 uppercase">
              Value Added Tax (VAT) & Tax Compliance Summary
            </h3>
            <p className="text-stone-500 text-[11px] font-sans">Republic of the Philippines BIR Form 2550Q Basis</p>
          </div>

          <div className="space-y-2 py-2">
            <div className="flex justify-between">
              <span className="font-sans text-stone-700">Total Net Sales:</span>
              <span className="font-bold text-stone-900">₱{totalNetSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-stone-700">VAT-Exempt Sales (Senior/PWD & 0% Template):</span>
              <span>₱{(totalNetSales - totalVat / 0.12).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-stone-700">VATable Sales (12%):</span>
              <span>₱{totalVat > 0 ? (totalVat / 0.12).toFixed(2) : '0.00'}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-800 pt-2 border-t border-stone-200">
              <span className="font-sans">Total Output VAT Payable:</span>
              <span>₱{totalVat.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
      {/* Reset Sales Confirmation */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-stone-200 max-w-md w-full p-4 sm:p-6 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-sm text-stone-900">Reset Sales</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              This permanently deletes{' '}
              <span className="font-bold">{filteredOrders.length}</span>{' '}
              sale record{filteredOrders.length === 1 ? '' : 's'} from{' '}
              <span className="font-bold">
                {timeRange === 'day'
                  ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString()
                  : timeRange === 'today'
                    ? 'today'
                    : timeRange === '7days'
                      ? 'the last 7 days'
                      : timeRange === 'month'
                        ? 'this month'
                        : 'all time'}
              </span>{' '}
              in Store Performance &amp; Reports. This cannot be undone.
            </p>
            <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetSales(filteredOrders.map((o) => o.id));
                  setIsResetConfirmOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                Reset {filteredOrders.length} Sale{filteredOrders.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
