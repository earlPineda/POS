import React, { useState } from 'react';
import { AddOnOption, CartCustomization, CartItem, MenuItem, MenuItemCustomization, MenuItemSize, OrderType, StaffUser } from '../types/pos';
import { DEFAULT_CUSTOMIZATION } from '../data/initialData';
import { Check, ChevronLeft, Coffee, Image as ImageIcon, Lock, Minus, Percent, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';

interface POSRegisterProps {
  menuItems: MenuItem[];
  currentStaff: StaffUser;
  onInitiateCheckout: (cart: CartItem[], orderType: OrderType, customerName: string, discount: { type: any; percent: number; amount: number }, vatRate: number) => void;
  // Optional lifted state for cart sync across tabs
  cart?: CartItem[];
  onUpdateCart?: (cart: CartItem[]) => void;
  orderType?: OrderType;
  onUpdateOrderType?: (type: OrderType) => void;
  customerName?: string;
  onUpdateCustomerName?: (name: string) => void;
  selectedDiscount?: 'none' | 'senior_pwd' | 'promo' | 'custom';
  onUpdateDiscount?: (discount: 'none' | 'senior_pwd' | 'promo' | 'custom') => void;
  customDiscountPercent?: number;
  onUpdateCustomDiscountPercent?: (percent: number) => void;
  enableVat?: boolean;
  onUpdateEnableVat?: (vat: boolean) => void;
  // Menu customization (picture & price editor)
  onRequestMenuEdit?: () => void;
  canEditMenu?: boolean;
}

export const POSRegister: React.FC<POSRegisterProps> = ({
  menuItems,
  currentStaff,
  onInitiateCheckout,
  cart: propCart,
  onUpdateCart,
  orderType: propOrderType,
  onUpdateOrderType,
  customerName: propCustomerName,
  onUpdateCustomerName,
  selectedDiscount: propDiscount,
  onUpdateDiscount,
  customDiscountPercent: propCustomPercent,
  onUpdateCustomDiscountPercent,
  enableVat: propEnableVat,
  onUpdateEnableVat,
  onRequestMenuEdit,
  canEditMenu,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Local state fallbacks if not lifted
  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  const cart = propCart !== undefined ? propCart : localCart;
  const setCart = (action: React.SetStateAction<CartItem[]>) => {
    const nextVal = typeof action === 'function' ? action(cart) : action;
    if (onUpdateCart) onUpdateCart(nextVal);
    else setLocalCart(nextVal);
  };

  const [localOrderType, setLocalOrderType] = useState<OrderType>('Dine-In');
  const orderType = propOrderType !== undefined ? propOrderType : localOrderType;
  const setOrderType = (type: OrderType) => {
    if (onUpdateOrderType) onUpdateOrderType(type);
    else setLocalOrderType(type);
  };

  const [localCustomerName, setLocalCustomerName] = useState<string>('');
  const customerName = propCustomerName !== undefined ? propCustomerName : localCustomerName;
  const setCustomerName = (name: string) => {
    if (onUpdateCustomerName) onUpdateCustomerName(name);
    else setLocalCustomerName(name);
  };

  const [localDiscount, setLocalDiscount] = useState<'none' | 'senior_pwd' | 'promo' | 'custom'>('none');
  const selectedDiscount = propDiscount !== undefined ? propDiscount : localDiscount;
  const setSelectedDiscount = (disc: 'none' | 'senior_pwd' | 'promo' | 'custom') => {
    if (onUpdateDiscount) onUpdateDiscount(disc);
    else setLocalDiscount(disc);
  };

  const [localCustomPercent, setLocalCustomPercent] = useState<number>(10);
  const customDiscountPercent = propCustomPercent !== undefined ? propCustomPercent : localCustomPercent;
  const setCustomDiscountPercent = (p: number) => {
    if (onUpdateCustomDiscountPercent) onUpdateCustomDiscountPercent(p);
    else setLocalCustomPercent(p);
  };

  const [localEnableVat, setLocalEnableVat] = useState<boolean>(false);
  const enableVat = propEnableVat !== undefined ? propEnableVat : localEnableVat;
  const setEnableVat = (vat: boolean) => {
    if (onUpdateEnableVat) onUpdateEnableVat(vat);
    else setLocalEnableVat(vat);
  };

  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  // Customization Modal State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedSize, setSelectedSize] = useState<MenuItemSize | null>(null);
  const [customization, setCustomization] = useState<CartCustomization>({
    iceLevel: DEFAULT_CUSTOMIZATION.iceLevels[0] ?? 'Regular Ice',
    sweetness: DEFAULT_CUSTOMIZATION.sweetnessLevels[0] ?? '100% Normal',
    milkType: DEFAULT_CUSTOMIZATION.milkOptions[0]?.label ?? 'Full Cream Milk',
    addOns: [],
    notes: '',
  });

  const categories = [
    'All',
    'Fruit Infused Matcha',
    'Signature & Creafoam',
    'Matcha & Espresso Fusion',
    'Classic & Roasted',
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Open customization modal
  const handleItemClick = (item: MenuItem) => {
    if (!item.inStock) return;
    const config = item.customization ?? DEFAULT_CUSTOMIZATION;
    setCustomizingItem(item);
    setSelectedSize(item.sizes[0] || null);
    setCustomization({
      iceLevel: config.iceLevels[0] ?? 'Regular Ice',
      sweetness: config.sweetnessLevels[0] ?? '100% Normal',
      milkType: config.milkOptions[0]?.label ?? 'Full Cream Milk',
      addOns: [],
      notes: '',
    });
  };

  // Per-item customization config (falls back to the full default option set)
  const customConfig: MenuItemCustomization = customizingItem?.customization ?? DEFAULT_CUSTOMIZATION;

  const toggleAddOn = (addOn: AddOnOption) => {
    setCustomization((prev) => ({
      ...prev,
      addOns: prev.addOns.some((a) => a.id === addOn.id)
        ? prev.addOns.filter((a) => a.id !== addOn.id)
        : [...prev.addOns, { id: addOn.id, label: addOn.label, price: addOn.price }],
    }));
  };

  const handleAddToCart = () => {
    if (!customizingItem || !selectedSize) return;

    const config = customizingItem.customization ?? DEFAULT_CUSTOMIZATION;
    let extraCost = 0;
    let extraFoodCost = 0;

    const milkOption = config.milkOptions.find((m) => m.label === customization.milkType);
    extraCost += milkOption?.price ?? 0;
    extraFoodCost += milkOption?.cost ?? 0;

    for (const addOn of customization.addOns) {
      extraCost += addOn.price;
      extraFoodCost += config.addOns.find((a) => a.id === addOn.id)?.cost ?? 0;
    }

    const unitPrice = selectedSize.price + extraCost;
    const unitCost = selectedSize.recipeCost + extraFoodCost;

    const newItem: CartItem = {
      cartItemId: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      menuItemId: customizingItem.id,
      name: customizingItem.name,
      size: selectedSize.size,
      unitPrice,
      unitCost,
      quantity: 1,
      customization: { ...customization },
      itemTotal: unitPrice,
      itemCostTotal: unitCost,
    };

    setCart([...cart, newItem]);
    setCustomizingItem(null);
  };

  const updateCartQty = (cartItemId: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.cartItemId === cartItemId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            quantity: newQty,
            itemTotal: item.unitPrice * newQty,
            itemCostTotal: item.unitCost * newQty,
          };
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    setCart(updated);
  };

  const removeCartItem = (cartItemId: string) => {
    setCart(cart.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cart Calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + item.itemTotal, 0);
  const totalCartCost = cart.reduce((sum, item) => sum + item.itemCostTotal, 0);

  let discountPercent = 0;
  let discountAmount = 0;

  if (selectedDiscount === 'senior_pwd') {
    discountPercent = 20;
    discountAmount = rawSubtotal * 0.2;
  } else if (selectedDiscount === 'promo') {
    discountAmount = Math.min(rawSubtotal, 50);
  } else if (selectedDiscount === 'custom') {
    discountPercent = customDiscountPercent;
    discountAmount = rawSubtotal * (customDiscountPercent / 100);
  }

  const discountedSubtotal = Math.max(0, rawSubtotal - discountAmount);
  const vatRate = enableVat ? 0.12 : 0;
  const vatAmount = discountedSubtotal * vatRate;
  const finalTotal = discountedSubtotal + vatAmount;
  const netProfit = finalTotal - totalCartCost;
  const foodCostPercent = finalTotal > 0 ? (totalCartCost / finalTotal) * 100 : 0;
  const totalCartQty = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-stone-50">
      {/* Product Catalog Grid (Left/Main Area) */}
      <div className="flex-1 flex flex-col p-3 sm:p-5 md:p-6 overflow-y-auto">
        {/* Category Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar touch-scroll p-1 bg-stone-200/80 rounded-lg shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-auto flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search drinks & flavors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-lg pl-9 pr-8 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Open the picture & price editor */}
            {onRequestMenuEdit && (
              <button
                onClick={onRequestMenuEdit}
                title={
                  canEditMenu
                    ? 'Add or edit menu items — pictures, prices & availability'
                    : 'Manager authorization required to edit the menu'
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:border-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Customize Menu</span>
                <span className="sm:hidden">Edit</span>
                {!canEditMenu && <Lock className="w-3 h-3 text-stone-400" />}
              </button>
            )}
          </div>
        </div>

        {/* Product Cards Grid - 2 cols on mobile, 3-4 on tablet/desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 pb-24 lg:pb-6">
          {filteredItems.map((item) => {
            const primarySize = item.sizes[0];
            const costRatio = primarySize ? ((primarySize.recipeCost / primarySize.price) * 100).toFixed(1) : '21.5';

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group flex flex-col bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-600/40 transition-all cursor-pointer text-left ${
                  !item.inStock ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {/* Image Container with Fallback */}
                <div className="relative h-28 sm:h-40 md:h-44 w-full bg-stone-100 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  {/* Subtle Top Metadata */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-2 sm:left-2 sm:right-2 flex items-center justify-between text-[9px] sm:text-[11px] font-medium pointer-events-none">
                    {item.badge ? (
                      <span className="bg-stone-900/85 text-emerald-400 px-1.5 py-0.5 rounded backdrop-blur-xs font-mono">
                        {item.badge}
                      </span>
                    ) : <span />}
                    <span className="bg-white/90 text-stone-700 px-1.5 py-0.5 rounded backdrop-blur-xs font-mono ml-auto">
                      {costRatio}% Cost
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-2.5 sm:p-3.5 md:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-emerald-800 line-clamp-1">
                      {item.category}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-stone-900 mt-0.5 group-hover:text-emerald-800 transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="hidden md:block text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-2 sm:mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] sm:text-[10px] text-stone-400 font-medium">From</div>
                      <div className="text-xs sm:text-base font-extrabold text-stone-900 font-mono">
                        ₱{primarySize?.price.toFixed(0)}
                      </div>
                    </div>

                    <button
                      disabled={!item.inStock}
                      className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all flex items-center gap-1 ${
                        item.inStock
                          ? 'bg-stone-900 group-hover:bg-emerald-700 active:scale-95 text-white cursor-pointer'
                          : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">
                        {!item.inStock ? 'Sold Out' : item.canCustomize ? 'Customize' : 'Add'}
                      </span>
                      <span className="sm:hidden">{!item.inStock ? 'Out' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Mobile Cart Summary Bar (Visible above bottom nav when items in cart) */}
        {cart.length > 0 && !isMobileCartOpen && (
          <div className="lg:hidden fixed bottom-16 sm:bottom-16 left-3 right-3 z-30 animate-in fade-in slide-in-from-bottom duration-150">
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="w-full bg-emerald-800 hover:bg-emerald-900 active:scale-[0.99] text-white p-3 rounded-xl shadow-2xl flex items-center justify-between font-bold text-xs sm:text-sm transition-all border border-emerald-600/40"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white text-emerald-900 flex items-center justify-center text-xs font-mono font-black shadow-xs">
                  {totalCartQty}
                </div>
                <span>View Order Ticket ({totalCartQty} {totalCartQty === 1 ? 'item' : 'items'})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm sm:text-base font-extrabold">₱{finalTotal.toFixed(2)}</span>
                <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded text-emerald-100">Review →</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Cart & Order Sidebar - Responsive Drawer on Mobile, Sticky Column on Desktop */}
      <div
        className={`${
          isMobileCartOpen
            ? 'fixed inset-0 z-50 flex flex-col bg-white overflow-hidden animate-in slide-in-from-bottom duration-200'
            : 'hidden lg:flex'
        } w-full lg:w-96 bg-white border-l border-stone-200 flex-col shrink-0 shadow-lg lg:shadow-none`}
      >
        {/* Cart Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 bg-stone-50 shrink-0">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="lg:hidden p-1 -ml-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-200"
                title="Back to Menu"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <ShoppingBag className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-stone-900">Current Order Ticket</h2>
            </div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-stone-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
              {/* Close Mobile Cart */}
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="lg:hidden p-1 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-200 ml-1"
                title="Back to Drinks"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dine-In / Takeout / Delivery Segmented Control */}
          <div className="grid grid-cols-3 gap-1 bg-stone-200 p-1 rounded-lg">
            {(['Dine-In', 'Takeout', 'Delivery'] as OrderType[]).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  orderType === type ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="mt-2.5">
            <input
              type="text"
              placeholder="Customer Name or Table # (Optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-md px-2.5 py-1 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Itemized Cart List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 divide-y divide-stone-100 touch-scroll">
          {cart.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-stone-400 p-6">
              <Coffee className="w-8 h-8 mb-2 stroke-1 text-stone-300" />
              <p className="text-xs font-medium">Cart is currently empty</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Select drinks from the menu to begin</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartItemId} className="pt-3 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-stone-500 font-mono">({item.size})</span>
                    </div>

                    {/* Customization Details */}
                    <div className="text-[11px] text-stone-500 mt-0.5 space-y-0.5 leading-tight">
                      <div>
                        {item.customization.iceLevel} · {item.customization.sweetness}
                      </div>
                      {item.customization.milkType !== 'Full Cream Milk' && (
                        <div className="text-emerald-700 font-medium">· {item.customization.milkType}</div>
                      )}
                      {(item.customization.addOns ?? []).map((addOn) => (
                        <div key={addOn.id} className="text-emerald-700 font-medium">
                          + {addOn.label} (₱{addOn.price})
                        </div>
                      ))}
                      {item.customization.notes && (
                        <div className="italic text-stone-600">Note: {item.customization.notes}</div>
                      )}
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs font-bold text-stone-900 tabular-nums">
                    ₱{item.itemTotal.toFixed(2)}
                  </div>
                </div>

                {/* Quantity Controls & Delete */}
                <div className="flex items-center justify-between mt-2 pt-1">
                  <span className="text-[10px] text-stone-400 font-mono">
                    COGS: ₱{item.itemCostTotal.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQty(item.cartItemId, -1)}
                      className="w-7 h-7 sm:w-6 sm:h-6 rounded bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono text-stone-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(item.cartItemId, 1)}
                      className="w-7 h-7 sm:w-6 sm:h-6 rounded bg-stone-100 hover:bg-stone-200 active:scale-90 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    </button>
                    <button
                      onClick={() => removeCartItem(item.cartItemId)}
                      className="text-stone-400 hover:text-rose-600 ml-1 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing, Discounts & Payment Trigger */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50/90 space-y-2.5 sm:space-y-3 shrink-0">
          {/* Discount Selectors */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-600 font-medium flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-stone-400" />
              <span>Discount</span>
            </span>
            <select
              value={selectedDiscount}
              onChange={(e) => setSelectedDiscount(e.target.value as any)}
              className="bg-white border border-stone-300 rounded px-2 py-1 text-xs text-stone-800 focus:outline-none"
            >
              <option value="none">None (0%)</option>
              <option value="senior_pwd">Senior / PWD (20%)</option>
              <option value="promo">Promo Coupon (-₱50)</option>
              <option value="custom">Custom (10%)</option>
            </select>
          </div>

          {/* Tax toggle */}
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>Include 12% VAT</span>
            <input
              type="checkbox"
              checked={enableVat}
              onChange={(e) => setEnableVat(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
          </div>

          {/* Subtotal, Discount, Margin breakdown */}
          <div className="space-y-1 pt-1.5 border-t border-stone-200 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">₱{rawSubtotal.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Discount Applied</span>
                <span className="font-mono tabular-nums">-₱{discountAmount.toFixed(2)}</span>
              </div>
            )}

            {enableVat && (
              <div className="flex justify-between text-stone-600">
                <span>12% VAT</span>
                <span className="font-mono tabular-nums">₱{vatAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm sm:text-base font-extrabold text-stone-900 pt-1.5 border-t border-stone-300">
              <span>Total Payable</span>
              <span className="font-mono text-emerald-800 tabular-nums">₱{finalTotal.toFixed(2)}</span>
            </div>

            {cart.length > 0 && (
              <div className="text-[10px] sm:text-[11px] text-stone-500 flex justify-between pt-0.5 font-mono">
                <span>Est. Net Profit: ₱{netProfit.toFixed(2)}</span>
                <span>COGS: {foodCostPercent.toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Checkout Button */}
          <button
            onClick={() => {
              setIsMobileCartOpen(false);
              onInitiateCheckout(
                cart,
                orderType,
                customerName || 'Walk-In Guest',
                { type: selectedDiscount, percent: discountPercent, amount: discountAmount },
                vatRate
              );
            }}
            disabled={cart.length === 0}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
              cart.length === 0
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] cursor-pointer'
            }`}
          >
            <span>Proceed to Payment</span>
            <span className="font-mono font-bold">· ₱{finalTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* Drink Customization Modal (Responsive Bottom Sheet on Mobile, Centered Modal on Tablet/Desktop) */}
      {customizingItem && selectedSize && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-stone-200 max-w-lg w-full max-h-[92dvh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm">{customizingItem.name}</h3>
                <p className="text-[11px] sm:text-xs text-stone-400">Configure size, sweetener, dairy & recipe extras</p>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="text-stone-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto overscroll-contain">
              {/* Cup Size */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">
                  Select Size
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {customizingItem.sizes.map((s) => (
                    <button
                      key={s.size}
                      onClick={() => setSelectedSize(s)}
                      className={`p-3 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                        selectedSize.size === s.size
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-stone-900">{s.size}</div>
                        <div className="text-[11px] text-stone-500">Food Cost: ₱{s.recipeCost.toFixed(2)}</div>
                      </div>
                      <div className="font-mono font-bold text-xs text-emerald-800">₱{s.price.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {customizingItem.canCustomize && (
                <>
                  {/* Sweetness */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">
                      Sweetness Level (Agave)
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {customConfig.sweetnessLevels.map(
                        (lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setCustomization({ ...customization, sweetness: lvl })}
                            className={`py-2 px-1 text-[11px] font-medium rounded border text-center transition-colors cursor-pointer ${
                              customization.sweetness === lvl
                                ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                                : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            {lvl.split(' ')[0]}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Ice Level */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">
                      Ice Level
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {customConfig.iceLevels.map((ice) => (
                        <button
                          key={ice}
                          onClick={() => setCustomization({ ...customization, iceLevel: ice })}
                          className={`py-2 text-xs font-medium rounded border text-center transition-colors cursor-pointer ${
                            customization.iceLevel === ice
                              ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                              : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {ice}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Milk Options */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">
                      Dairy & Alternative Milk
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {customConfig.milkOptions.map((milk) => (
                        <button
                          key={milk.label}
                          onClick={() => setCustomization({ ...customization, milkType: milk.label })}
                          className={`p-2.5 rounded border text-left text-xs transition-all cursor-pointer ${
                            customization.milkType === milk.label
                              ? 'border-emerald-600 bg-emerald-50 text-stone-900 font-semibold'
                              : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {milk.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add-ons & Modifiers */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">
                      Recipe Add-ons
                    </label>
                    <div className="space-y-2">
                      {customConfig.addOns.map((addOn) => {
                        const isChecked = customization.addOns.some((a) => a.id === addOn.id);
                        return (
                          <label
                            key={addOn.id}
                            className="flex items-center justify-between p-2.5 rounded border border-stone-200 hover:bg-stone-50 cursor-pointer"
                          >
                            <span className="text-xs font-medium text-stone-800">{addOn.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-emerald-800">
                                +₱{addOn.price.toFixed(2)}
                              </span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAddOn(addOn)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Special Note */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Barista Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra cold, separate lid, double cup"
                  value={customization.notes || ''}
                  onChange={(e) => setCustomization({ ...customization, notes: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => setCustomizingItem(null)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCart}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Add to Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
