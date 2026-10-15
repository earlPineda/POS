import React, { useMemo, useRef, useState } from 'react';
import { AddOnOption, MenuCategory, MenuItem, MenuItemCustomization, MenuItemSize, MilkOption } from '../types/pos';
import {
  cloneDefaultCustomization,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_ICE_LEVELS,
  DEFAULT_SWEETNESS_LEVELS,
  INITIAL_MENU_ITEMS,
} from '../data/initialData';
import { processImageFile } from '../utils/imageUtils';
import { AlertTriangle, Check, ChevronDown, Image as ImageIcon, Plus, RotateCcw, Upload, X } from 'lucide-react';

interface MenuCustomizerProps {
  menuItems: MenuItem[];
  /** Persist changes (including newly added items). Returns false when storage failed. */
  onSave: (updated: MenuItem[]) => boolean;
  onClose: () => void;
}

const MENU_CATEGORIES: MenuCategory[] = [
  'Fruit Infused Matcha',
  'Signature & Creafoam',
  'Matcha & Espresso Fusion',
  'Classic & Roasted',
];

// Fallback picture for newly added items without a custom photo
const DEFAULT_NEW_IMAGE = '/src/assets/images/matcha_classic_iced_1791965570490.jpg';

interface NewItemForm {
  name: string;
  category: MenuCategory;
  description: string;
  price: number;
  image: string;
}

type FileTarget = { kind: 'row'; index: number } | { kind: 'new' };

const EMPTY_FORM: NewItemForm = {
  name: '',
  category: 'Classic & Roasted',
  description: '',
  price: 0,
  image: DEFAULT_NEW_IMAGE,
};

export const MenuCustomizer: React.FC<MenuCustomizerProps> = ({ menuItems, onSave, onClose }) => {
  // Working copy of the full menu (pictures, prices, names, categories, availability…)
  const [draftItems, setDraftItems] = useState<MenuItem[]>(() =>
    menuItems.map((item) => ({ ...item, sizes: item.sizes.map((s) => ({ ...s })) }))
  );
  const [changedImageIds, setChangedImageIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [form, setForm] = useState<NewItemForm>(EMPTY_FORM);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Item ids whose drink-customization panel (sizes, sweetness, ice, milk, add-ons) is open */
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileTargetRef = useRef<FileTarget>({ kind: 'new' });

  const isDirty = useMemo(
    () => JSON.stringify(draftItems) !== JSON.stringify(menuItems),
    [draftItems, menuItems]
  );

  const openFilePicker = (target: FileTarget) => {
    fileTargetRef.current = target;
    fileInputRef.current?.click();
  };

  const applyImageFile = async (target: FileTarget, file: File) => {
    setError(null);
    const targetId =
      target.kind === 'row' ? (draftItems[target.index]?.id ?? null) : '__new__';
    setProcessingId(targetId);
    try {
      const dataUrl = await processImageFile(file);
      if (target.kind === 'row') {
        const rowId = draftItems[target.index]?.id;
        setDraftItems((prev) =>
          prev.map((it, i) => (i === target.index ? { ...it, image: dataUrl } : it))
        );
        if (rowId) {
          setChangedImageIds((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
        }
      } else {
        setForm((prev) => ({ ...prev, image: dataUrl }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load that picture.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = fileTargetRef.current;
    e.target.value = ''; // allow re-selecting the same file later
    if (file) void applyImageFile(target, file);
  };

  const handleDrop = (e: React.DragEvent, target: FileTarget) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void applyImageFile(target, file);
  };

  const resetImage = (index: number) => {
    const itemId = draftItems[index]?.id;
    const original = INITIAL_MENU_ITEMS.find((i) => i.id === itemId);
    setDraftItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, image: original ? original.image : DEFAULT_NEW_IMAGE } : it
      )
    );
    setChangedImageIds((prev) => prev.filter((id) => id !== itemId));
  };

  const patchItem = (index: number, patch: Partial<MenuItem>) => {
    setDraftItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const setPrice = (index: number, sizeIdx: number, value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    setDraftItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? { ...it, sizes: it.sizes.map((s, si) => (si === sizeIdx ? { ...s, price: safe } : s)) }
          : it
      )
    );
  };

  // ---------------------------------------------------------------------------
  // Drink customization editors (per item: oz sizes, sweetness, ice, milk, add-ons)
  // ---------------------------------------------------------------------------
  const getConfig = (item: MenuItem): MenuItemCustomization => item.customization ?? DEFAULT_CUSTOMIZATION;

  const patchConfig = (index: number, patch: Partial<MenuItemCustomization>) => {
    setDraftItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? { ...it, customization: { ...(it.customization ?? DEFAULT_CUSTOMIZATION), ...patch } }
          : it
      )
    );
  };

  const toggleInList = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const patchSize = (index: number, sizeIdx: number, patch: Partial<MenuItemSize>) => {
    setDraftItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? { ...it, sizes: it.sizes.map((s, si) => (si === sizeIdx ? { ...s, ...patch } : s)) }
          : it
      )
    );
  };

  const addSize = (index: number) => {
    setDraftItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const last = it.sizes[it.sizes.length - 1];
        const used = new Set(it.sizes.map((s) => s.size));
        const label = ['12oz', '16oz', '22oz', 'Regular'].find((c) => !used.has(c)) ?? `Size ${it.sizes.length + 1}`;
        const nextSize: MenuItemSize = {
          size: label,
          price: last?.price ?? 0,
          recipeCost: last?.recipeCost ?? 0,
          ingredients: [],
          packaging: [],
        };
        return { ...it, sizes: [...it.sizes, nextSize] };
      })
    );
  };

  const removeSize = (index: number, sizeIdx: number) => {
    setDraftItems((prev) =>
      prev.map((it, i) =>
        i === index && it.sizes.length > 1 ? { ...it, sizes: it.sizes.filter((_, si) => si !== sizeIdx) } : it
      )
    );
  };

  const patchMilkOption = (index: number, milkIdx: number, patch: Partial<MilkOption>) => {
    const cfg = getConfig(draftItems[index]);
    patchConfig(index, {
      milkOptions: cfg.milkOptions.map((m, mi) => (mi === milkIdx ? { ...m, ...patch } : m)),
    });
  };

  const addMilkOption = (index: number) => {
    const cfg = getConfig(draftItems[index]);
    patchConfig(index, {
      milkOptions: [...cfg.milkOptions, { label: 'New Milk (+₱0)', price: 0, cost: 0 }],
    });
  };

  const removeMilkOption = (index: number, milkIdx: number) => {
    const cfg = getConfig(draftItems[index]);
    patchConfig(index, { milkOptions: cfg.milkOptions.filter((_, mi) => mi !== milkIdx) });
  };

  const patchAddOn = (index: number, addOnIdx: number, patch: Partial<AddOnOption>) => {
    const cfg = getConfig(draftItems[index]);
    patchConfig(index, {
      addOns: cfg.addOns.map((a, ai) => (ai === addOnIdx ? { ...a, ...patch } : a)),
    });
  };

  const addAddOn = (index: number) => {
    const cfg = getConfig(draftItems[index]);
    patchConfig(index, {
      addOns: [
        ...cfg.addOns,
        { id: `addon-${Date.now().toString(36)}-${cfg.addOns.length}`, label: 'New Add-on', price: 0, cost: 0 },
      ],
    });
  };

  const removeAddOn = (index: number, addOnIdx: number) => {
    const cfg = getConfig(draftItems[index]);
    patchConfig(index, { addOns: cfg.addOns.filter((_, ai) => ai !== addOnIdx) });
  };

  const resetConfig = (index: number) => patchConfig(index, cloneDefaultCustomization());

  // Shared compact input styles for the customization editors
  const numInputCls =
    'w-16 bg-white border border-stone-300 rounded px-2 py-1 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500';
  const textInputCls =
    'bg-white border border-stone-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500';

  const handleAddItem = () => {
    const name = form.name.trim();
    if (!name) {
      setError('Enter a name for the new menu item.');
      return;
    }
    const newItem: MenuItem = {
      id: `menu-custom-${Date.now().toString(36)}`,
      name,
      category: form.category,
      description: form.description.trim() || 'Newly added menu item.',
      image: form.image || DEFAULT_NEW_IMAGE,
      inStock: true,
      canCustomize: true,
      customization: cloneDefaultCustomization(),
      sizes: [
        { size: '16oz', price: Math.max(0, form.price), recipeCost: 0, ingredients: [], packaging: [] },
      ],
    };
    setDraftItems((prev) => [...prev, newItem]);
    setForm(EMPTY_FORM);
    setIsAdding(false);
    setError(null);
  };

  const handleSave = () => {
    if (onSave(draftItems)) {
      onClose();
    } else {
      setSaveError(
        'Could not save — browser storage is full. Try restoring a default picture or using smaller images.'
      );
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-stone-200 max-w-4xl w-full max-h-[92dvh] flex flex-col overflow-hidden my-auto animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-stone-900 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Customize Menu — Add, Edit, Pictures &amp; Prices</h3>
              <p className="text-[11px] text-stone-400 truncate">
                Add items, edit names/prices, set sweetness, ice, oz sizes, milk &amp; add-ons, or drop a picture onto a photo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setIsAdding((v) => !v);
                setError(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                isAdding ? 'bg-stone-700 text-stone-200' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{isAdding ? 'Close' : 'Add Menu Item'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white transition-colors p-1 cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-4 sm:px-6 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {/* Add New Menu Item Panel */}
        {isAdding && (
          <div className="px-3 sm:px-5 py-3 sm:py-4 bg-emerald-50 border-b border-emerald-200 space-y-3 shrink-0">
            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800">
              Add New Menu Item
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Honeydew Matcha"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as MenuCategory })}
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {MENU_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Price — 16oz (₱)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short description shown on the card"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => openFilePicker({ kind: 'new' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-[11px] font-semibold text-stone-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{form.image !== DEFAULT_NEW_IMAGE ? 'Change Picture' : 'Choose Picture (optional)'}</span>
              </button>
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-200 border border-stone-300 shrink-0">
                <img src={form.image} alt="preview" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1" />
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!form.name.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Menu</span>
              </button>
            </div>
          </div>
        )}
        {/* Item List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 space-y-3">
          {draftItems.map((item, index) => {
            const isProcessing = processingId === item.id;
            const hasCustomImage = changedImageIds.includes(item.id);
            const original = INITIAL_MENU_ITEMS.find((i) => i.id === item.id);
            const cfg = getConfig(item);
            const isExpanded = expandedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 border border-stone-200 rounded-xl bg-white hover:border-stone-300 transition-colors"
              >
                {/* Picture */}
                <div
                  className="relative w-full sm:w-40 h-36 sm:h-36 shrink-0 rounded-lg overflow-hidden bg-stone-100 border-2 border-dashed border-stone-300 group cursor-pointer"
                  onClick={() => openFilePicker({ kind: 'row', index })}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, { kind: 'row', index })}
                  title="Click to browse or drop a picture file"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className={`w-full h-full object-cover ${item.inStock ? '' : 'grayscale opacity-60'}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  {!item.inStock && (
                    <span className="absolute top-1.5 left-1.5 bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      Unavailable
                    </span>
                  )}
                  <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white pointer-events-none">
                    <Upload className="w-5 h-5" />
                    <span className="text-[11px] font-semibold px-2 text-center">
                      {isProcessing ? 'Processing…' : 'Click or drop picture'}
                    </span>
                  </div>
                  {hasCustomImage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetImage(index);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/90 text-stone-600 hover:text-emerald-700 shadow-xs pointer-events-auto cursor-pointer"
                      title="Restore default picture"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {/* Name, category, description, price & availability */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-0.5">
                        Name
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => patchItem(index, { name: e.target.value })}
                        className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-0.5">
                        Category
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) =>
                          patchItem(index, { category: e.target.value as MenuCategory })
                        }
                        className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        {MENU_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-0.5">
                      Description
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => patchItem(index, { description: e.target.value })}
                      className="w-full bg-white border border-stone-300 rounded px-2 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    {item.sizes.map((size, sizeIdx) => (
                      <label key={sizeIdx} className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-stone-600 uppercase">
                          {size.size}
                        </span>
                        <span className="text-stone-400 text-xs">₱</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={size.price}
                          onChange={(e) => setPrice(index, sizeIdx, Number(e.target.value))}
                          className="w-24 bg-white border border-stone-300 rounded px-2 py-1 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </label>
                    ))}
                    {original && item.sizes[0]?.price !== original.sizes[0]?.price && (
                      <button
                        onClick={() => setPrice(index, 0, original.sizes[0]?.price ?? 0)}
                        className="text-[11px] text-stone-400 hover:text-emerald-700 underline underline-offset-2 cursor-pointer"
                      >
                        reset price
                      </button>
                    )}

                    {/* Availability toggle — e.g. "no matcha available" */}
                    <button
                      onClick={() => patchItem(index, { inStock: !item.inStock })}
                      title={
                        item.inStock
                          ? 'Mark this item unavailable (e.g. no matcha available)'
                          : 'Make this item available again'
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        item.inStock
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700'
                          : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
                      }`}
                    >
                      {item.inStock
                        ? '● Available — click to mark unavailable'
                        : '● Unavailable (sold out) — click to restore'}
                    </button>
                  </div>

                  <button
                    onClick={() => openFilePicker({ kind: 'row', index })}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-[11px] font-semibold text-stone-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Change Picture</span>
                  </button>

                  <button
                    onClick={() => patchItem(index, { canCustomize: !item.canCustomize })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      item.canCustomize
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700'
                        : 'bg-stone-100 border-stone-300 text-stone-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                  >
                    {item.canCustomize ? '● Drink Customizations On' : '○ Drink Customizations Off'}
                  </button>
                </div>

                <button
                  onClick={() => toggleExpanded(item.id)}
                  className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-[11px] font-semibold text-stone-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  <span>
                    {isExpanded
                      ? 'Hide Customization Options'
                      : 'Customize Options — Size (oz), Sweetness, Ice, Milk, Add-ons'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-1.5 p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                        Register Customization Options
                      </span>
                      <button
                        onClick={() => resetConfig(index)}
                        className="text-[11px] text-stone-400 hover:text-emerald-700 underline underline-offset-2 cursor-pointer shrink-0"
                      >
                        reset to defaults
                      </button>
                    </div>

                    {/* Cup Sizes (oz) */}
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                        Cup Sizes (oz) — label, price &amp; recipe cost
                      </span>
                      <div className="space-y-1.5">
                        {item.sizes.map((size, sizeIdx) => (
                          <div key={sizeIdx} className="flex items-center gap-1.5 flex-wrap">
                            <input
                              type="text"
                              value={size.size}
                              onChange={(e) => patchSize(index, sizeIdx, { size: e.target.value })}
                              className={`${textInputCls} w-24 font-bold text-stone-900`}
                            />
                            <span className="text-[10px] text-stone-500">₱</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={size.price}
                              onChange={(e) =>
                                patchSize(index, sizeIdx, { price: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className={`${numInputCls} font-bold text-stone-900`}
                            />
                            <span className="text-[10px] text-stone-500">Cost</span>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={size.recipeCost}
                              onChange={(e) =>
                                patchSize(index, sizeIdx, { recipeCost: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className={`${numInputCls} text-stone-700`}
                            />
                            <button
                              onClick={() => removeSize(index, sizeIdx)}
                              disabled={item.sizes.length <= 1}
                              className={`p-1 rounded ${
                                item.sizes.length <= 1
                                  ? 'text-stone-300 cursor-not-allowed'
                                  : 'text-stone-400 hover:text-rose-600 cursor-pointer'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => addSize(index)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Cup Size
                      </button>
                    </div>

                    {/* Sweetness Levels */}
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                        Sweetness Levels Offered
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {DEFAULT_SWEETNESS_LEVELS.map((lvl) => {
                          const active = cfg.sweetnessLevels.includes(lvl);
                          return (
                            <button
                              key={lvl}
                              onClick={() =>
                                patchConfig(index, { sweetnessLevels: toggleInList(cfg.sweetnessLevels, lvl) })
                              }
                              className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                                active
                                  ? 'bg-stone-900 text-white border-stone-900'
                                  : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300'
                              }`}
                            >
                              {lvl}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ice Levels */}
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                        Ice Levels Offered
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {DEFAULT_ICE_LEVELS.map((ice) => {
                          const active = cfg.iceLevels.includes(ice);
                          return (
                            <button
                              key={ice}
                              onClick={() => patchConfig(index, { iceLevels: toggleInList(cfg.iceLevels, ice) })}
                              className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                                active
                                  ? 'bg-stone-900 text-white border-stone-900'
                                  : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300'
                              }`}
                            >
                              {ice}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Milk Options (incl. Daily Fresh Milk) */}
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                        Milk Options — label, +price &amp; food cost
                      </span>
                      <div className="space-y-1.5">
                        {cfg.milkOptions.map((milk, milkIdx) => (
                          <div key={milkIdx} className="flex items-center gap-1.5 flex-wrap">
                            <input
                              type="text"
                              value={milk.label}
                              onChange={(e) => patchMilkOption(index, milkIdx, { label: e.target.value })}
                              className={`${textInputCls} flex-1 min-w-[9rem] text-stone-900`}
                            />
                            <span className="text-[10px] text-stone-500">+₱</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={milk.price}
                              onChange={(e) =>
                                patchMilkOption(index, milkIdx, { price: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className={`${numInputCls} font-bold text-stone-900`}
                            />
                            <span className="text-[10px] text-stone-500">Cost</span>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={milk.cost}
                              onChange={(e) =>
                                patchMilkOption(index, milkIdx, { cost: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className={`${numInputCls} text-stone-700`}
                            />
                            <button
                              onClick={() => removeMilkOption(index, milkIdx)}
                              className="p-1 rounded text-stone-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => addMilkOption(index)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Milk Option
                      </button>
                    </div>

                    {/* Recipe Add-ons */}
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                        Recipe Add-ons — label, +price &amp; food cost
                      </span>
                      <div className="space-y-1.5">
                        {cfg.addOns.map((addOn, addOnIdx) => (
                          <div key={addOn.id} className="flex items-center gap-1.5 flex-wrap">
                            <input
                              type="text"
                              value={addOn.label}
                              onChange={(e) => patchAddOn(index, addOnIdx, { label: e.target.value })}
                              className={`${textInputCls} flex-1 min-w-[9rem] text-stone-900`}
                            />
                            <span className="text-[10px] text-stone-500">+₱</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={addOn.price}
                              onChange={(e) =>
                                patchAddOn(index, addOnIdx, { price: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className={`${numInputCls} font-bold text-stone-900`}
                            />
                            <span className="text-[10px] text-stone-500">Cost</span>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={addOn.cost}
                              onChange={(e) =>
                                patchAddOn(index, addOnIdx, { cost: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className={`${numInputCls} text-stone-700`}
                            />
                            <button
                              onClick={() => removeAddOn(index, addOnIdx)}
                              className="p-1 rounded text-stone-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => addAddOn(index)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Recipe Add-on
                      </button>
                    </div>

                    <p className="text-[10px] text-stone-400 leading-snug">
                      These options appear in the register's drink customization popup for this item.
                      Prices are charged to the customer; costs feed the COGS &amp; margin reports.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-stone-500">
            Pictures are resized (max 800px) and compressed before being stored in this browser.
            Unavailable items cannot be sold at the register. Customization options (oz sizes, sweetness,
            ice, milk &amp; add-ons) apply per item at the register.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className={`px-5 py-2 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all ${
                isDirty
                  ? 'text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 cursor-pointer'
                  : 'text-stone-400 bg-stone-200 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {saveError && (
          <div className="px-4 sm:px-6 py-2 bg-rose-50 border-t border-rose-200 text-xs text-rose-700">
            {saveError}
          </div>
        )}

        {/* Shared hidden file picker — target set on open/drop */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>
    </div>
  );
};



