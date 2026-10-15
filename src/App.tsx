import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { SubHeaderToolbar } from './components/SubHeaderToolbar';
import { POSRegister } from './components/POSRegister';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { RecipeCostCalculator } from './components/RecipeCostCalculator';
import { InventoryManager } from './components/InventoryManager';
import { AnalyticsReports } from './components/AnalyticsReports';
import { KDSView } from './components/KDSView';
import { BackupSecurity } from './components/BackupSecurity';
import { PinLockModal } from './components/PinLockModal';
import { MenuCustomizer } from './components/MenuCustomizer';
import { MobileNav } from './components/MobileNav';
import {
  CartItem,
  Ingredient,
  MenuItem,
  OfflineSyncItem,
  Order,
  OrderType,
  PaymentDetails,
  RecipeTemplate,
  StaffUser,
  StockAdjustmentLog,
  StoreLocation,
} from './types/pos';
import {
  deductInventoryForOrder,
  loadActiveCart,
  loadCurrentLocation,
  loadCurrentStaff,
  loadIngredients,
  loadLocations,
  loadMenuItems,
  loadOrders,
  loadRecipes,
  loadSimulatedOffline,
  loadStaff,
  loadStockLogs,
  loadSyncQueue,
  normalizeStaffList,
  saveActiveCart,
  saveCurrentLocation,
  saveCurrentStaff,
  saveIngredients,
  saveLocations,
  saveMenuItems,
  saveOrders,
  saveRecipes,
  saveSimulatedOffline,
  saveStaff,
  saveStockLogs,
  saveSyncQueue,
} from './utils/storage';

export default function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<string>('register');
  // PIN modal is only used to switch between the admin & staff accounts.
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  // Menu Customizer (pictures, prices & drink options editor) — admin only
  const [isMenuEditorOpen, setIsMenuEditorOpen] = useState<boolean>(false);

  // Core Data State
  const [staffList, setStaffList] = useState<StaffUser[]>(() => loadStaff());
  const [currentStaff, setCurrentStaff] = useState<StaffUser>(() => loadCurrentStaff());
  const [locations, setLocations] = useState<StoreLocation[]>(() => loadLocations());
  const [currentLocation, setCurrentLocation] = useState<StoreLocation>(() => loadCurrentLocation());
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => loadIngredients());
  const [recipes, setRecipes] = useState<RecipeTemplate[]>(() => loadRecipes());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => loadMenuItems());
  const [orders, setOrders] = useState<Order[]>(() => loadOrders());
  const [stockLogs, setStockLogs] = useState<StockAdjustmentLog[]>(() => loadStockLogs());
  const [syncQueue, setSyncQueue] = useState<OfflineSyncItem[]>(() => loadSyncQueue());

  // Offline and Network State
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => loadSimulatedOffline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active Transaction State
  const [cart, setCart] = useState<CartItem[]>(() => loadActiveCart());
  const [checkoutCart, setCheckoutCart] = useState<{
    cart: CartItem[];
    orderType: OrderType;
    customerName: string;
    discount: { type: any; percent: number; amount: number };
    vatRate: number;
    finalTotal: number;
  } | null>(null);

  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Synchronize cart changes to localStorage
  useEffect(() => {
    saveActiveCart(cart);
  }, [cart]);

  // Synchronize state changes to localStorage
  useEffect(() => {
    saveStaff(staffList);
  }, [staffList]);

  // Enforce the two seeded accounts (admin + staff) — strips stale extra staff
  // but NEVER forces the session back to admin; staff sessions must persist.
  useEffect(() => {
    const normalized = normalizeStaffList(staffList);
    if (JSON.stringify(normalized) !== JSON.stringify(staffList)) {
      setStaffList(normalized);
    }
    if (!normalized.some((s) => s.id === currentStaff.id)) {
      setCurrentStaff(normalized[0]);
    }
  }, [staffList, currentStaff]);

  useEffect(() => {
    saveCurrentStaff(currentStaff);
  }, [currentStaff]);

  useEffect(() => {
    saveLocations(locations);
  }, [locations]);

  useEffect(() => {
    saveCurrentLocation(currentLocation);
  }, [currentLocation]);

  useEffect(() => {
    saveIngredients(ingredients);
  }, [ingredients]);

  useEffect(() => {
    saveRecipes(recipes);
  }, [recipes]);

  useEffect(() => {
    saveMenuItems(menuItems);
  }, [menuItems]);

  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    saveStockLogs(stockLogs);
  }, [stockLogs]);

  useEffect(() => {
    saveSyncQueue(syncQueue);
  }, [syncQueue]);

  useEffect(() => {
    saveSimulatedOffline(isSimulatedOffline);
  }, [isSimulatedOffline]);

  // Tab switching — Reports & Security (all sales) are strictly admin-only.
  // If a staff session somehow lands on one (e.g. restored state), bounce to register.
  const handleTabChange = (targetTab: string) => {
    if ((targetTab === 'reports' || targetTab === 'security') && currentStaff.role !== 'admin') {
      setActiveTab('register');
      return;
    }
    setActiveTab(targetTab);
  };

  // Safety net: staff must never stay on Reports / Security.
  useEffect(() => {
    if (currentStaff.role !== 'admin' && (activeTab === 'reports' || activeTab === 'security')) {
      setActiveTab('register');
    }
  }, [currentStaff, activeTab]);

  // Checkout Initiation from Register
  const handleInitiateCheckout = (
    cart: CartItem[],
    orderType: OrderType,
    customerName: string,
    discount: { type: any; percent: number; amount: number },
    vatRate: number
  ) => {
    const rawSubtotal = cart.reduce((sum, item) => sum + item.itemTotal, 0);
    const discounted = Math.max(0, rawSubtotal - discount.amount);
    const vat = discounted * vatRate;
    const finalTotal = discounted + vat;

    setCheckoutCart({
      cart,
      orderType,
      customerName,
      discount,
      vatRate,
      finalTotal,
    });
  };

  // Finalize Payment & Order Creation
  const handleCompletePayment = (payment: PaymentDetails) => {
    if (!checkoutCart) return;

    const rawSubtotal = checkoutCart.cart.reduce((sum, item) => sum + item.itemTotal, 0);
    const totalCost = checkoutCart.cart.reduce((sum, item) => sum + item.itemCostTotal, 0);
    const orderNumber = `ORD-${1000 + orders.length + 1}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      createdAt: now,
      locationId: currentLocation.id,
      locationName: currentLocation.name,
      cashierId: currentStaff.id,
      cashierName: currentStaff.name,
      orderType: checkoutCart.orderType,
      customerName: checkoutCart.customerName,
      items: checkoutCart.cart,
      subtotal: rawSubtotal,
      discountType: checkoutCart.discount.type,
      discountPercent: checkoutCart.discount.percent,
      discountAmount: checkoutCart.discount.amount,
      vatRate: checkoutCart.vatRate,
      vatAmount: (rawSubtotal - checkoutCart.discount.amount) * checkoutCart.vatRate,
      total: checkoutCart.finalTotal,
      totalCost,
      netProfit: checkoutCart.finalTotal - totalCost,
      payment,
      status: 'completed',
      isOfflineCreated: isSimulatedOffline,
      syncedToCloud: !isSimulatedOffline,
    };

    // Deduct stock in real-time from inventory
    const { updatedIngredients, logs } = deductInventoryForOrder(
      newOrder,
      ingredients,
      recipes,
      currentStaff.name,
      menuItems
    );

    setIngredients(updatedIngredients);
    setStockLogs((prev) => [...prev, ...logs]);
    setOrders((prev) => [newOrder, ...prev]);

    // If offline, add to offline synchronization queue
    if (isSimulatedOffline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-${Date.now()}`,
        type: 'order',
        data: newOrder,
        timestamp: now,
        status: 'pending',
      };
      setSyncQueue((prev) => [...prev, syncItem]);
    }

    setCheckoutCart(null);
    setCart([]);
    saveActiveCart([]);
    setActiveReceiptOrder(newOrder);
  };

  // Update order status (for KDS)
  const handleUpdateOrderStatus = (orderId: string, status: 'completed' | 'preparing' | 'ready' | 'refunded') => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  // Apply order edits made in the KDS editor (customer, type, items, totals)
  const handleEditOrder = (updated: Order) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  // Remove an order from the Orders/KDS dashboard only — the sale stays in reports
  const handleDeleteOrderFromKDS = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, hiddenFromKDS: true } : o))
    );
  };

  // Reset Sales (Reports): permanently delete the selected sales records
  const handleResetSales = (orderIds: string[]) => {
    setOrders((prev) => prev.filter((o) => !orderIds.includes(o.id)));
  };

  // Recipe updating & sync to Menu
  const handleSaveRecipe = (updatedRecipe: RecipeTemplate) => {
    setRecipes((prev) => prev.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r)));
  };

  const handleSyncRecipeToMenu = (recipe: RecipeTemplate) => {
    setMenuItems((prev) =>
      prev.map((item) => {
        if (item.name.toLowerCase().includes(recipe.bevName.toLowerCase()) || recipe.bevName.toLowerCase().includes(item.name.toLowerCase())) {
          return {
            ...item,
            sizes: item.sizes.map((s) => {
              if (s.size === recipe.size) {
                const totalCost = recipe.ingredients.reduce((sum, i) => sum + i.totalCost, 0);
                return {
                  ...s,
                  price: recipe.estSalePriceVatInc,
                  recipeCost: totalCost,
                  ingredients: recipe.ingredients,
                  packaging: recipe.packaging,
                };
              }
              return s;
            }),
          };
        }
        return item;
      })
    );
  };

  // Menu Customizer: admin-only — opens directly with no PIN prompt.
  // Staff accounts cannot customize the system (the button is hidden for them).
  const handleRequestMenuEdit = () => {
    if (currentStaff.role === 'admin') {
      setIsMenuEditorOpen(true);
    }
  };

  // Persist menu edits (pictures & prices); returns false if browser storage is full
  const handleSaveMenuItems = (updated: MenuItem[]): boolean => {
    if (!saveMenuItems(updated)) return false;
    setMenuItems(updated);
    return true;
  };

  // Inventory update handler
  const handleUpdateIngredients = (updated: Ingredient[], newLog?: StockAdjustmentLog) => {
    setIngredients(updated);
    if (newLog) {
      setStockLogs((prev) => [...prev, newLog]);
      if (isSimulatedOffline) {
        setSyncQueue((prev) => [
          ...prev,
          {
            id: `sync-${Date.now()}`,
            type: 'inventory_adjustment',
            data: newLog,
            timestamp: new Date().toISOString(),
            status: 'pending',
          },
        ]);
      }
    }
  };

  // Force Cloud Sync
  const handleForceSync = () => {
    if (isSimulatedOffline) return;
    setIsSyncing(true);
    setTimeout(() => {
      // Mark all orders as synced
      setOrders((prev) => prev.map((o) => ({ ...o, syncedToCloud: true })));
      setSyncQueue([]);
      setIsSyncing(false);
    }, 1000);
  };

  // Encrypted Restore Handler
  const handleRestoreData = (restored: any) => {
    if (restored.orders) setOrders(restored.orders);
    if (restored.ingredients) setIngredients(restored.ingredients);
    if (restored.recipes) setRecipes(restored.recipes);
    if (restored.menuItems) setMenuItems(restored.menuItems);
    if (restored.staff) {
      // Backups may contain legacy staff — keep only the admin account.
      const normalizedStaff = normalizeStaffList(restored.staff);
      setStaffList(normalizedStaff);
      setCurrentStaff((prev) => normalizedStaff.find((s) => s.id === prev.id) ?? normalizedStaff[0]);
    }
    if (restored.locations) setLocations(restored.locations);
  };

  // Find low stock items
  const lowStockItems = ingredients.filter((i) => i.currentStock <= i.minThreshold);
  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 text-stone-900 select-none">
      {/* Top Bar Contract Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        currentStaff={currentStaff}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        currentLocation={currentLocation}
        isOffline={isSimulatedOffline}
        pendingSyncCount={syncQueue.length}
      />

      {/* Operational Toolbar (Branch Switcher, Cloud Sync Simulator, Low Stock Alerts) */}
      <SubHeaderToolbar
        locations={locations}
        currentLocation={currentLocation}
        onSelectLocation={(loc) => setCurrentLocation(loc)}
        isOffline={isSimulatedOffline}
        onToggleOffline={() => {
          const next = !isSimulatedOffline;
          setIsSimulatedOffline(next);
          if (!next && syncQueue.length > 0) {
            handleForceSync();
          }
        }}
        pendingSyncCount={syncQueue.length}
        onForceSync={handleForceSync}
        isSyncing={isSyncing}
        lowStockItems={lowStockItems}
        onNavigateToInventory={() => setActiveTab('inventory')}
      />

      {/* Main Viewport Router */}
      <main className="flex-1 overflow-hidden flex flex-col pb-16 lg:pb-0">
        {activeTab === 'register' && (
          <POSRegister
            menuItems={menuItems}
            currentStaff={currentStaff}
            onInitiateCheckout={handleInitiateCheckout}
            cart={cart}
            onUpdateCart={setCart}
            onRequestMenuEdit={handleRequestMenuEdit}
            canEditMenu={currentStaff.role === 'admin'}
          />
        )}

        {activeTab === 'orders' && (
          <div className="flex-1 overflow-y-auto">
            <KDSView
              orders={orders}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onViewReceipt={(order) => setActiveReceiptOrder(order)}
              onEditOrder={handleEditOrder}
              onDeleteOrder={handleDeleteOrderFromKDS}
            />
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="flex-1 overflow-y-auto">
            <InventoryManager
              ingredients={ingredients}
              stockLogs={stockLogs}
              currentStaff={currentStaff}
              onUpdateIngredients={handleUpdateIngredients}
            />
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="flex-1 overflow-y-auto">
            <RecipeCostCalculator
              recipes={recipes}
              onSaveRecipe={handleSaveRecipe}
              onSyncToMenu={handleSyncRecipeToMenu}
            />
          </div>
        )}

        {activeTab === 'reports' && currentStaff.role === 'admin' && (
          <div className="flex-1 overflow-y-auto">
            <AnalyticsReports
              orders={orders}
              currentLocationName={currentLocation.name}
              onResetSales={handleResetSales}
            />
          </div>
        )}

        {activeTab === 'security' && currentStaff.role === 'admin' && (
          <div className="flex-1 overflow-y-auto">
            <BackupSecurity
              staffList={staffList}
              currentStaff={currentStaff}
              onUpdateStaffList={setStaffList}
              allData={{
                orders,
                ingredients,
                recipes,
                menuItems,
                locations,
              }}
              onRestoreData={handleRestoreData}
              syncQueue={syncQueue}
              onForceSync={handleForceSync}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablet screens < lg) */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        cartCount={0}
        lowStockCount={lowStockItems.length}
        currentStaff={currentStaff}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        currentLocation={currentLocation}
        locations={locations}
        onSelectLocation={(loc) => setCurrentLocation(loc)}
        isOffline={isSimulatedOffline}
        onToggleOffline={() => {
          const next = !isSimulatedOffline;
          setIsSimulatedOffline(next);
          if (!next && syncQueue.length > 0) {
            handleForceSync();
          }
        }}
      />

      {/* Payment Tender Modal */}
      {checkoutCart && (
        <PaymentModal
          isOpen={true}
          onClose={() => setCheckoutCart(null)}
          totalAmount={checkoutCart.finalTotal}
          onCompletePayment={handleCompletePayment}
        />
      )}

      {/* Thermal Receipt Preview Modal */}
      {activeReceiptOrder && (
        <ReceiptModal
          order={activeReceiptOrder}
          onClose={() => setActiveReceiptOrder(null)}
        />
      )}

      {/* Menu Customizer — edit menu pictures & prices (admin/manager) */}
      {isMenuEditorOpen && (
        <MenuCustomizer
          menuItems={menuItems}
          onSave={handleSaveMenuItems}
          onClose={() => setIsMenuEditorOpen(false)}
        />
      )}

      {/* Staff Account Switcher (PIN required only when switching to the other account) */}
      <PinLockModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        staffList={staffList}
        currentStaff={currentStaff}
        onSelectStaff={(user) => {
          setCurrentStaff(user);
          // Staff accounts can't remain on admin-only screens after a switch.
          if (user.role !== 'admin' && (activeTab === 'reports' || activeTab === 'security')) {
            setActiveTab('register');
          }
        }}
      />
    </div>
  );
}
