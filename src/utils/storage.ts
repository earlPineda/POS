import { INITIAL_INGREDIENTS, INITIAL_LOCATIONS, INITIAL_MENU_ITEMS, INITIAL_ORDERS, INITIAL_RECIPES, INITIAL_STAFF, cloneDefaultCustomization } from '../data/initialData';
import { CartItem, Ingredient, MenuItem, OfflineSyncItem, Order, RecipeTemplate, StaffUser, StockAdjustmentLog, StoreLocation } from '../types/pos';

const STORAGE_KEYS = {
  // v3: staff collapsed into a single shared "POS Account"
  STAFF: 'mpos_staff_v3',
  CURRENT_STAFF: 'mpos_current_staff_v3',
  LOCATIONS: 'mpos_locations_v2',
  CURRENT_LOCATION: 'mpos_current_loc_v2',
  INGREDIENTS: 'mpos_ingredients_v2',
  RECIPES: 'mpos_recipes_v2',
  MENU_ITEMS: 'mpos_menu_items_v2',
  ORDERS: 'mpos_orders_v2',
  SYNC_QUEUE: 'mpos_sync_queue_v2',
  STOCK_LOGS: 'mpos_stock_logs_v2',
  OFFLINE_MODE: 'mpos_simulated_offline_v2',
  ACTIVE_CART: 'mpos_active_cart_v2',
};

// Safe JSON parser
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse ${key}`, e);
    return fallback;
  }
}

function setStored<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`Failed to store ${key}`, e);
    return false;
  }
}

/**
 * The terminal has exactly two accounts:
 *  - Admin ("JAZZ SICAT", PIN 1990) — may customize the system (menu, prices, backups)
 *  - Staff (PIN 0202) — register only; cannot customize the system
 * Any extra entries (stale sessions, legacy single-account data, restored
 * backups, ad-hoc staff) are stripped and the seeded PINs re-asserted.
 */
export function normalizeStaffList(staff: StaffUser[] | undefined | null): StaffUser[] {
  void staff; // stored lists are ignored — the two seeded accounts are canonical
  return INITIAL_STAFF.map((s) => ({ ...s }));
}

export function loadStaff(): StaffUser[] {
  const stored = getStored<StaffUser[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  const normalized = normalizeStaffList(stored);
  // Persist the reduction (e.g. old sessions wrote multiple staff back to storage).
  if (JSON.stringify(normalized) !== JSON.stringify(stored)) {
    setStored(STORAGE_KEYS.STAFF, normalized);
  }
  return normalized;
}

export function saveStaff(staff: StaffUser[]): void {
  setStored(STORAGE_KEYS.STAFF, normalizeStaffList(staff));
}

export function loadCurrentStaff(): StaffUser {
  // Remember which of the two accounts is signed in (defaults to the admin).
  const accounts = loadStaff();
  const stored = getStored<StaffUser | null>(STORAGE_KEYS.CURRENT_STAFF, null);
  const match = stored ? accounts.find((a) => a.id === stored.id) ?? null : null;
  const resolved = match ?? accounts[0];
  if (JSON.stringify(stored) !== JSON.stringify(resolved)) {
    setStored(STORAGE_KEYS.CURRENT_STAFF, resolved);
  }
  return resolved;
}

export function saveCurrentStaff(staff: StaffUser): void {
  setStored(STORAGE_KEYS.CURRENT_STAFF, staff);
}

export function loadLocations(): StoreLocation[] {
  return getStored<StoreLocation[]>(STORAGE_KEYS.LOCATIONS, INITIAL_LOCATIONS);
}

export function saveLocations(locations: StoreLocation[]): void {
  setStored(STORAGE_KEYS.LOCATIONS, locations);
}

export function loadCurrentLocation(): StoreLocation {
  return getStored<StoreLocation>(STORAGE_KEYS.CURRENT_LOCATION, INITIAL_LOCATIONS[0]);
}

export function saveCurrentLocation(loc: StoreLocation): void {
  setStored(STORAGE_KEYS.CURRENT_LOCATION, loc);
}

export function loadIngredients(): Ingredient[] {
  return getStored<Ingredient[]>(STORAGE_KEYS.INGREDIENTS, INITIAL_INGREDIENTS);
}

export function saveIngredients(ingredients: Ingredient[]): void {
  setStored(STORAGE_KEYS.INGREDIENTS, ingredients);
}

export function loadRecipes(): RecipeTemplate[] {
  return getStored<RecipeTemplate[]>(STORAGE_KEYS.RECIPES, INITIAL_RECIPES);
}

export function saveRecipes(recipes: RecipeTemplate[]): void {
  setStored(STORAGE_KEYS.RECIPES, recipes);
}

export function loadMenuItems(): MenuItem[] {
  const items = getStored<MenuItem[]>(STORAGE_KEYS.MENU_ITEMS, INITIAL_MENU_ITEMS);
  // Ensure only the 14 matcha drinks from the user's images are loaded (guard against any old cache)
  if (!items || items.length === 0 || items.some((i) => (i.category as string) === 'Pastries & Food' || i.name.toLowerCase().includes('croissant'))) {
    saveMenuItems(INITIAL_MENU_ITEMS);
    return INITIAL_MENU_ITEMS;
  }
  // Migrate menus saved before per-item customization options existed.
  const migrated = items.map((it) => (it.customization ? it : { ...it, customization: cloneDefaultCustomization() }));
  if (migrated.some((it, idx) => it !== items[idx])) {
    saveMenuItems(migrated);
  }
  return migrated;
}

export function saveMenuItems(items: MenuItem[]): boolean {
  return setStored(STORAGE_KEYS.MENU_ITEMS, items);
}

export function loadActiveCart(): CartItem[] {
  return getStored<CartItem[]>(STORAGE_KEYS.ACTIVE_CART, []);
}

export function saveActiveCart(cart: CartItem[]): void {
  setStored(STORAGE_KEYS.ACTIVE_CART, cart);
}

export function loadOrders(): Order[] {
  return getStored<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
}

export function saveOrders(orders: Order[]): void {
  setStored(STORAGE_KEYS.ORDERS, orders);
}

export function loadSyncQueue(): OfflineSyncItem[] {
  return getStored<OfflineSyncItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
}

export function saveSyncQueue(queue: OfflineSyncItem[]): void {
  setStored(STORAGE_KEYS.SYNC_QUEUE, queue);
}

export function loadStockLogs(): StockAdjustmentLog[] {
  return getStored<StockAdjustmentLog[]>(STORAGE_KEYS.STOCK_LOGS, []);
}

export function saveStockLogs(logs: StockAdjustmentLog[]): void {
  setStored(STORAGE_KEYS.STOCK_LOGS, logs);
}

export function loadSimulatedOffline(): boolean {
  return getStored<boolean>(STORAGE_KEYS.OFFLINE_MODE, false);
}

export function saveSimulatedOffline(isOffline: boolean): void {
  setStored(STORAGE_KEYS.OFFLINE_MODE, isOffline);
}

export function deductInventoryForOrder(
  order: Order,
  currentIngredients: Ingredient[],
  recipes: RecipeTemplate[],
  staffName: string,
  menuItems?: MenuItem[]
): { updatedIngredients: Ingredient[]; logs: StockAdjustmentLog[] } {
  const updated = [...currentIngredients];
  const newLogs: StockAdjustmentLog[] = [];
  const now = new Date().toISOString();

  for (const item of order.items) {
    // Find matching recipe or extract ingredients from size
    const matchingRecipe = recipes.find(
      (r) => r.bevName.toLowerCase() === item.name.toLowerCase() ||
             r.bevName.toLowerCase().includes(item.name.toLowerCase()) ||
             item.name.toLowerCase().includes(r.bevName.toLowerCase())
    );

    let recipeIngredients = matchingRecipe?.ingredients || [];
    let packagingList = matchingRecipe?.packaging || [];

    // Fallback to menu item size specification if recipe template is not standalone
    if (recipeIngredients.length === 0 && menuItems) {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId || m.name.toLowerCase() === item.name.toLowerCase());
      if (menuItem) {
        const sizeDef = menuItem.sizes.find((s) => s.size === item.size) || menuItem.sizes[0];
        if (sizeDef) {
          recipeIngredients = sizeDef.ingredients || [];
          packagingList = sizeDef.packaging || [];
        }
      }
    }

    const allToDeduct = [...recipeIngredients, ...packagingList];

    for (const recIng of allToDeduct) {
      const ingIndex = updated.findIndex((i) => i.id === recIng.ingredientId || i.name.toLowerCase() === recIng.productName.toLowerCase());
      if (ingIndex !== -1) {
        const totalQtyDeducted = recIng.quantity * item.quantity;
        const previousStock = updated[ingIndex].currentStock;
        const newStock = Math.max(0, previousStock - totalQtyDeducted);

        updated[ingIndex] = {
          ...updated[ingIndex],
          currentStock: newStock,
        };

        newLogs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          ingredientId: updated[ingIndex].id,
          ingredientName: updated[ingIndex].name,
          type: 'order_deduction',
          quantityDelta: -totalQtyDeducted,
          unit: updated[ingIndex].unit,
          reason: `Sale ${order.orderNumber} (${item.quantity}x ${item.name} ${item.size})`,
          staffName,
          timestamp: now,
        });
      }
    }

    // Also deduct customized extras if any
    if (item.customization?.milkType.includes('Oat')) {
      const oatIdx = updated.findIndex((i) => i.name.toLowerCase().includes('oat milk'));
      if (oatIdx !== -1) {
        const deduct = 120 * item.quantity;
        updated[oatIdx] = { ...updated[oatIdx], currentStock: Math.max(0, updated[oatIdx].currentStock - deduct) };
      }
    }
    for (const addOn of item.customization?.addOns ?? []) {
      if (addOn.label.toLowerCase().includes('cream')) {
        const creamIdx = updated.findIndex((i) => i.name.toLowerCase().includes('cream'));
        if (creamIdx !== -1) {
          const deduct = 25 * item.quantity;
          updated[creamIdx] = { ...updated[creamIdx], currentStock: Math.max(0, updated[creamIdx].currentStock - deduct) };
        }
      }
    }
  }

  return { updatedIngredients: updated, logs: newLogs };
}
