export type UserRole = 'admin' | 'manager' | 'cashier' | 'barista';

export interface StaffUser {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  avatarColor: string;
}

export type IngredientCategory =
  | 'Packaging'
  | 'Matcha & Tea'
  | 'Dairy & Milk'
  | 'Fruit Purees & Ube'
  | 'Syrups & Sweeteners'
  | 'Coffee & Espresso'
  | 'Toppings & Ice';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: 'g' | 'ml' | 'pcs';
  currentStock: number;
  minThreshold: number;
  costPerBulk: number; // cost per kg or L or 1000pcs
  bulkUnit: 'kg' | 'L' | 'pack(1000)';
  costPerServingUnit: number; // cost per g, ml, or pc
  supplier: string;
  lastRestocked: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  productName: string;
  quantity: number; // in grams, ml, or pcs
  costKgLt: number; // e.g. 4000.00
  totalCost: number; // calculated cost for this portion
}

export interface RecipePackaging {
  ingredientId: string;
  productName: string;
  quantity: number;
  costKgLt: number;
  totalCost: number;
}

export interface RecipeTemplate {
  id: string;
  bevName: string;
  size: '12oz' | '16oz' | 'Regular';
  estSalePriceVatInc: number;
  vatPercent: number;
  salePriceVatEx: number;
  ingredients: RecipeIngredient[];
  packaging: RecipePackaging[];
}

export interface MenuItemSize {
  /** Free-form cup label — e.g. '12oz', '16oz', '22oz Tumbler', 'Regular' */
  size: string;
  price: number;
  recipeCost: number;
  ingredients: RecipeIngredient[];
  packaging: RecipePackaging[];
}

/** A milk choice offered for a specific menu item (surcharge + food cost are editable). */
export interface MilkOption {
  /** Display label including surcharge, e.g. 'Oat Milk (+₱30)' */
  label: string;
  price: number; // surcharge added to the sale price
  cost: number; // food cost added to the item COGS
}

/** A recipe add-on (topper/shot) offered for a specific menu item. */
export interface AddOnOption {
  id: string;
  label: string; // e.g. 'Extra Ceremonial Matcha Shot (+2g)'
  price: number;
  cost: number;
}

/**
 * Per-menu-item configuration of which drink customizations the cashier
 * can offer at the register (sweetness levels, ice levels, milk & add-ons).
 * Cup sizes (oz) live on `MenuItem.sizes`.
 */
export interface MenuItemCustomization {
  sweetnessLevels: string[];
  iceLevels: string[];
  milkOptions: MilkOption[];
  addOns: AddOnOption[];
}

export type MenuCategory =
  | 'Fruit Infused Matcha'
  | 'Signature & Creafoam'
  | 'Matcha & Espresso Fusion'
  | 'Classic & Roasted';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  image: string;
  inStock: boolean;
  canCustomize: boolean;
  sizes: MenuItemSize[];
  /** Which sweetness/ice/milk/add-on options the register offers. Falls back to defaults when missing. */
  customization?: MenuItemCustomization;
  badge?: string;
}

/** A single add-on attached to a cart line item (snapshot of the option at time of sale). */
export interface CartAddOn {
  id: string;
  label: string;
  price: number;
}

export interface CartCustomization {
  iceLevel: string;
  sweetness: string;
  milkType: string;
  /** Selected recipe add-ons (multi-select) */
  addOns: CartAddOn[];
  notes?: string;
}

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  size: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  customization: CartCustomization;
  itemTotal: number;
  itemCostTotal: number;
}

export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'card' | 'store_credit';
export type OrderType = 'Dine-In' | 'Takeout' | 'Delivery';

export interface PaymentDetails {
  method: PaymentMethod;
  tendered?: number;
  change?: number;
  referenceNo?: string;
  cardLast4?: string;
  cardAuthCode?: string;
  paidAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  locationId: string;
  locationName: string;
  cashierId: string;
  cashierName: string;
  orderType: OrderType;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discountType: 'none' | 'senior_pwd' | 'promo' | 'custom';
  discountPercent: number;
  discountAmount: number;
  vatRate: number; // e.g. 0.12 or 0
  vatAmount: number;
  total: number;
  totalCost: number;
  netProfit: number;
  payment: PaymentDetails;
  status: 'completed' | 'preparing' | 'ready' | 'refunded';
  isOfflineCreated: boolean;
  syncedToCloud: boolean;
  /** Soft-delete from the Orders/KDS dashboard only — the sale remains counted in Reports. */
  hiddenFromKDS?: boolean;
}

export interface StoreLocation {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  isCurrent: boolean;
}

export interface OfflineSyncItem {
  id: string;
  type: 'order' | 'inventory_adjustment' | 'recipe_edit';
  data: any;
  timestamp: string;
  status: 'pending' | 'synced' | 'failed';
}

export interface StockAdjustmentLog {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: 'restock' | 'waste' | 'reconciliation' | 'order_deduction';
  quantityDelta: number;
  unit: string;
  reason: string;
  staffName: string;
  timestamp: string;
}
