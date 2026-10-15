import React, { useState } from 'react';
import { RecipeIngredient, RecipePackaging, RecipeTemplate } from '../types/pos';
import { Calculator, Download, Plus, Printer, RefreshCw, Sparkles, Trash2 } from 'lucide-react';

interface RecipeCostCalculatorProps {
  recipes: RecipeTemplate[];
  onSaveRecipe: (updatedRecipe: RecipeTemplate) => void;
  onSyncToMenu: (recipe: RecipeTemplate) => void;
}

export const RecipeCostCalculator: React.FC<RecipeCostCalculatorProps> = ({
  recipes,
  onSaveRecipe,
  onSyncToMenu,
}) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipes[0]?.id || 'rec-12oz-classic');
  const activeRecipe = recipes.find((r) => r.id === selectedRecipeId) || recipes[0];

  // Local state for active editing
  const [bevName, setBevName] = useState<string>(activeRecipe.bevName);
  const [estSalePrice, setEstSalePrice] = useState<number>(activeRecipe.estSalePriceVatInc);
  const [vatPercent, setVatPercent] = useState<number>(activeRecipe.vatPercent);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(activeRecipe.ingredients);
  const [packaging, setPackaging] = useState<RecipePackaging[]>(activeRecipe.packaging);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Sync state when recipe selection changes
  const handleSelectRecipe = (id: string) => {
    const target = recipes.find((r) => r.id === id);
    if (target) {
      setSelectedRecipeId(target.id);
      setBevName(target.bevName);
      setEstSalePrice(target.estSalePriceVatInc);
      setVatPercent(target.vatPercent);
      setIngredients(target.ingredients);
      setPackaging(target.packaging);
    }
  };

  // Calculations matching template
  const totalIngredientCost = ingredients.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
  const totalPackagingCost = packaging.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
  // Net Cost is calculated from the active recipe ingredients (which in template includes packaging or ingredients)
  const netCost = totalIngredientCost;
  const salePriceVatEx = estSalePrice / (1 + vatPercent / 100);
  const netCostPercentage = salePriceVatEx > 0 ? (netCost / salePriceVatEx) * 100 : 0;
  const netProfit = salePriceVatEx - netCost;
  const netProfitPercentage = 100 - netCostPercentage;

  // Pie chart calculation
  const foodCostRatio = Math.min(100, Math.max(0, netCostPercentage));
  const profitRatio = Math.max(0, 100 - foodCostRatio);

  // Update ingredient row
  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...ingredients];
    const item = { ...updated[index], [field]: value };

    // Auto-calculate total cost: (Quantity / 1000) * CostKgLt (for grams/ml) or Quantity * CostKgLt
    if (field === 'quantity' || field === 'costKgLt') {
      const q = field === 'quantity' ? Number(value) : item.quantity;
      const c = field === 'costKgLt' ? Number(value) : item.costKgLt;
      // If product is packaging or pc, total is (q * c) / 1000 if c is per 1000, else standard metric
      if (item.productName.toLowerCase().includes('packaging')) {
        item.totalCost = Number(((q * c) / 1000).toFixed(2));
      } else {
        item.totalCost = Number(((q * c) / 1000).toFixed(2));
      }
    }
    updated[index] = item;
    setIngredients(updated);
  };

  const addIngredientRow = () => {
    const newRow: RecipeIngredient = {
      ingredientId: `custom-ing-${Date.now()}`,
      productName: 'New Ingredient',
      quantity: 10,
      costKgLt: 100.0,
      totalCost: 1.0,
    };
    setIngredients([...ingredients, newRow]);
  };

  const removeIngredientRow = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSaveAndSync = () => {
    const updated: RecipeTemplate = {
      id: activeRecipe.id,
      bevName,
      size: activeRecipe.size,
      estSalePriceVatInc: estSalePrice,
      vatPercent,
      salePriceVatEx,
      ingredients,
      packaging,
    };

    onSaveRecipe(updated);
    onSyncToMenu(updated);
    setSaveFeedback('Recipe & POS prices successfully updated!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const exportRecipeCSV = () => {
    const rows = [
      ['Beverage Name', bevName],
      ['Estimated Sale Price (VAT Inc)', `PHP ${estSalePrice.toFixed(2)}`],
      ['VAT %', `${vatPercent}%`],
      ['Sale Price (VAT Ex)', `PHP ${salePriceVatEx.toFixed(2)}`],
      ['Net Cost', `PHP ${netCost.toFixed(2)}`],
      ['Net Cost %', `${netCostPercentage.toFixed(2)}%`],
      ['Net Profit', `PHP ${netProfit.toFixed(2)}`],
      [''],
      ['INGREDIENTS', 'Quantity (Grams/ml)', 'Cost (Kg/Lt)', 'Total Cost (PHP)'],
      ...ingredients.map((i) => [i.productName, i.quantity, i.costKgLt, i.totalCost.toFixed(2)]),
      ['TOTAL INGREDIENTS', '', '', netCost.toFixed(2)],
      [''],
      ['PACKAGING SUB-SECTION', 'Quantity', 'Cost (Kg/Lt)', 'Total Cost (PHP)'],
      ...packaging.map((p) => [p.productName, p.quantity, p.costKgLt, p.totalCost.toFixed(2)]),
      ['TOTAL PACKAGING', '', '', totalPackagingCost.toFixed(2)],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${bevName.replace(/\s+/g, '_')}_food_cost_breakdown.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 lg:pb-6">
      {/* Top Banner & Recipe Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-700" />
            <span>Food Cost Calculator</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
            Template: Apicbase Matcha Classic Recipe & Ingredient Cost Engineering
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg overflow-x-auto max-w-full">
            {recipes.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectRecipe(r.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  r.id === selectedRecipeId
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {r.bevName}
              </button>
            ))}
          </div>

          <button
            onClick={exportRecipeCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors border border-stone-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors border border-stone-200"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {saveFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span className="font-medium">{saveFeedback}</span>
        </div>
      )}

      {/* Main Apicbase Template Layout */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Top Header section matching PDF Page 1 */}
        <div className="p-3.5 sm:p-6 border-b border-stone-200 bg-stone-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Financial Parameters Column */}
            <div className="lg:col-span-7 space-y-2.5 sm:space-y-3">
              <div className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-1 sm:gap-3 py-1.5 border-b border-stone-200/80">
                <span className="w-full sm:col-span-5 text-xs font-bold text-stone-700 uppercase tracking-wide">
                  Bev Name
                </span>
                <div className="w-full sm:col-span-7">
                  <input
                    type="text"
                    value={bevName}
                    onChange={(e) => setBevName(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-1 sm:gap-3 py-1.5 border-b border-stone-200/80">
                <span className="w-full sm:col-span-5 text-xs font-semibold text-stone-600 uppercase">
                  EST. SALE PRICE (VAT INC)
                </span>
                <div className="w-full sm:col-span-7 flex items-center gap-1 font-mono">
                  <span className="text-xs text-stone-400">₱</span>
                  <input
                    type="number"
                    step="0.5"
                    value={estSalePrice}
                    onChange={(e) => setEstSalePrice(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:ring-1 focus:ring-emerald-500 tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-1 sm:gap-3 py-1.5 border-b border-stone-200/80">
                <span className="w-full sm:col-span-5 text-xs font-semibold text-stone-600 uppercase">
                  VAT %
                </span>
                <div className="w-full sm:col-span-7 flex items-center gap-1">
                  <input
                    type="number"
                    value={vatPercent}
                    onChange={(e) => setVatPercent(Math.max(0, Number(e.target.value)))}
                    className="w-24 bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:ring-1 focus:ring-emerald-500 tabular-nums"
                  />
                  <span className="text-xs text-stone-500">%</span>
                </div>
              </div>

              <div className="flex flex-row justify-between sm:grid sm:grid-cols-12 items-center gap-1 sm:gap-3 py-1.5 border-b border-stone-200/80">
                <span className="sm:col-span-5 text-xs font-semibold text-stone-600 uppercase">
                  SALE PRICE (VAT EX)
                </span>
                <div className="sm:col-span-7 font-mono text-xs font-semibold text-stone-900 tabular-nums text-right sm:text-left">
                  ₱{salePriceVatEx.toFixed(2)}
                </div>
              </div>

              <div className="flex flex-row justify-between sm:grid sm:grid-cols-12 items-center gap-1 sm:gap-3 py-1.5 border-b border-stone-200/80">
                <span className="sm:col-span-5 text-xs font-semibold text-stone-600 uppercase">
                  Net Cost
                </span>
                <div className="sm:col-span-7 font-mono text-xs font-bold text-rose-700 tabular-nums text-right sm:text-left">
                  ₱{netCost.toFixed(2)}
                </div>
              </div>

              <div className="flex flex-row justify-between sm:grid sm:grid-cols-12 items-center gap-1 sm:gap-3 py-1.5 border-b border-stone-200/80">
                <span className="sm:col-span-5 text-xs font-semibold text-stone-600 uppercase">
                  Net Cost Percentage
                </span>
                <div className="sm:col-span-7 font-mono text-xs font-bold text-rose-700 tabular-nums text-right sm:text-left">
                  {netCostPercentage.toFixed(2)}%
                </div>
              </div>

              <div className="flex flex-row justify-between sm:grid sm:grid-cols-12 items-center gap-1 sm:gap-3 py-2 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/60">
                <span className="sm:col-span-5 text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
                  NET PROFIT
                </span>
                <div className="sm:col-span-7 font-mono text-sm font-extrabold text-emerald-800 tabular-nums text-right sm:text-left">
                  ₱{netProfit.toFixed(2)} ({netProfitPercentage.toFixed(2)}%)
                </div>
              </div>
            </div>

            {/* Cost Distribution Chart Column matching Apicbase Template */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-stone-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                COST DISTRIBUTION
              </h3>

              <div className="relative w-48 h-48 flex items-center justify-center">
                {/* SVG Pie Chart */}
                <svg viewBox="0 0 100 100" className="w-48 h-48 -rotate-90">
                  {/* Food Cost Slice (Rose / Coral) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#f43f5e"
                    strokeWidth="24"
                    strokeDasharray={`${(foodCostRatio / 100) * 238.76} 238.76`}
                    strokeDashoffset="0"
                  />
                  {/* Net Profit Slice (Matcha Green) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#15803d"
                    strokeWidth="24"
                    strokeDasharray={`${(profitRatio / 100) * 238.76} 238.76`}
                    strokeDashoffset={`-${(foodCostRatio / 100) * 238.76}`}
                  />
                </svg>

                {/* Inner Center Cutout / Metrics */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-tight">Food Cost</span>
                  <span className="text-sm font-extrabold text-stone-900 font-mono">
                    {foodCostRatio.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Legend matching OCR */}
              <div className="flex items-center justify-center gap-6 mt-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-rose-500" />
                  <span className="text-stone-700">Food Cost {foodCostRatio.toFixed(1)}% (₱{netCost.toFixed(2)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-700" />
                  <span className="text-stone-700">Net Profit {profitRatio.toFixed(1)}% (₱{netProfit.toFixed(2)})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INGREDIENTS SECTION (Template with Bright Amber Banner) */}
        <div>
          {/* Section Banner Header */}
          <div className="bg-amber-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 flex items-center justify-between">
            <span>INGREDIENTS</span>
            <span className="font-mono text-[11px] normal-case tracking-normal">UOM: Metric (Grams · ml · Kg · Lt)</span>
          </div>

          <div className="overflow-x-auto no-scrollbar touch-scroll">
            <table className="w-full min-w-[560px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-amber-100/60 text-stone-800 border-b border-amber-200">
                  <th className="py-2.5 px-6 font-semibold">Product Name</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Quantity (Grams.ml)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Cost (Kg/Lt)</th>
                  <th className="py-2.5 px-6 font-semibold text-right">Total Cost</th>
                  <th className="py-2.5 px-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ingredients.map((item, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-2.5 px-6 font-medium text-stone-900">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateIngredient(idx, 'productName', e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-transparent hover:border-stone-300 focus:border-emerald-500 focus:ring-0 text-xs font-medium py-0.5"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <input
                        type="number"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateIngredient(idx, 'quantity', Number(e.target.value))}
                        className="w-20 text-right bg-stone-50 border border-stone-200 rounded px-2 py-0.5 text-xs font-mono tabular-nums focus:bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-stone-700">
                      ₱
                      <input
                        type="number"
                        step="10"
                        value={item.costKgLt}
                        onChange={(e) => updateIngredient(idx, 'costKgLt', Number(e.target.value))}
                        className="w-24 text-right bg-stone-50 border border-stone-200 rounded px-2 py-0.5 text-xs font-mono tabular-nums focus:bg-white ml-1"
                      />
                    </td>
                    <td className="py-2.5 px-6 text-right font-mono font-bold text-stone-900 tabular-nums">
                      ₱{Number(item.totalCost).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => removeIngredientRow(idx)}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Total row with yellow highlight matching Page 1 & 2 */}
                <tr className="bg-amber-400 font-bold text-stone-900 text-xs">
                  <td colSpan={3} className="py-2.5 px-6 uppercase tracking-wide">
                    TOTAL INGREDIENTS
                  </td>
                  <td className="py-2.5 px-6 text-right font-mono text-sm tabular-nums">
                    ₱{totalIngredientCost.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            <button
              onClick={addIngredientRow}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Add Ingredient Line</span>
            </button>

            <button
              onClick={handleSaveAndSync}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-98 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Save & Sync Price to POS Menu</span>
            </button>
          </div>
        </div>

        {/* PACKAGING SUB-SECTION (Matching PDF Page 2) */}
        {packaging.length > 0 && (
          <div className="border-t-4 border-stone-200">
            <div className="bg-amber-500 text-white font-bold text-xs uppercase tracking-wider px-4 sm:px-6 py-2">
              Packaging & Portioned Disposables
            </div>
            <div className="overflow-x-auto no-scrollbar touch-scroll">
              <table className="w-full min-w-[520px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-100/60 text-stone-800 border-b border-amber-200">
                    <th className="py-2.5 px-6 font-semibold">Product Name</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Quantity (Grams.ml)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Cost (Kg/Lt)</th>
                    <th className="py-2.5 px-6 font-semibold text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {packaging.map((pack, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/20">
                      <td className="py-2 px-6 font-medium text-stone-800">{pack.productName}</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums">{pack.quantity}</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums">₱{pack.costKgLt.toFixed(2)}</td>
                      <td className="py-2 px-6 text-right font-mono font-semibold tabular-nums">₱{pack.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-200/80 font-bold text-stone-900 text-xs">
                    <td colSpan={3} className="py-2 px-6 uppercase">
                      Packaging Subtotal
                    </td>
                    <td className="py-2 px-6 text-right font-mono tabular-nums">
                      ₱{totalPackagingCost.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
