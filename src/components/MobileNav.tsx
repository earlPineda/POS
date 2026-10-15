import React, { useState } from 'react';
import { StaffUser, StoreLocation } from '../types/pos';
import {
  BarChart3,
  Calculator,
  ChevronRight,
  ClipboardList,
  Coffee,
  Globe,
  Lock,
  Menu,
  Package,
  Shield,
  ShoppingBag,
  Store,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  lowStockCount: number;
  currentStaff: StaffUser;
  onOpenPinModal: () => void;
  currentLocation: StoreLocation;
  locations: StoreLocation[];
  onSelectLocation: (loc: StoreLocation) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  lowStockCount,
  currentStaff,
  onOpenPinModal,
  currentLocation,
  locations,
  onSelectLocation,
  isOffline,
  onToggleOffline,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isAdmin = currentStaff.role === 'admin';

  const handleTabClick = (tabId: string) => {
    // Double-guard: staff must never open Reports / Security (all sales).
    if ((tabId === 'reports' || tabId === 'security') && currentStaff.role !== 'admin') {
      return;
    }
    setActiveTab(tabId);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar for Mobile (< lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 backdrop-blur-md border-t border-stone-800 text-stone-300 px-3 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
        {/* 1. Register */}
        <button
          onClick={() => handleTabClick('register')}
          className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
            activeTab === 'register' ? 'text-emerald-400 font-bold' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[10px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Register</span>
        </button>

        {/* 2. Orders & KDS */}
        <button
          onClick={() => handleTabClick('orders')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
            activeTab === 'orders' ? 'text-emerald-400 font-bold' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">KDS Orders</span>
        </button>

        {/* 3. Inventory */}
        <button
          onClick={() => handleTabClick('inventory')}
          className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
            activeTab === 'inventory' ? 'text-emerald-400 font-bold' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className="relative">
            <Package className="w-5 h-5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-500 text-stone-900 text-[10px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {lowStockCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Inventory</span>
        </button>

        {/* 4. More Drawer */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
            ['recipes', 'reports', 'security'].includes(activeTab) || isMoreOpen
              ? 'text-emerald-400 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </nav>

      {/* Slide-Up Drawer for "More" menu on Mobile */}
      {isMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-stone-900/80 backdrop-blur-xs">
          <div className="bg-stone-900 text-stone-100 rounded-t-2xl border-t border-stone-800 p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Matcha Avenue Menu & Tools</h3>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Options */}
            <div className="space-y-1.5">
              <button
                onClick={() => handleTabClick('recipes')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                  activeTab === 'recipes'
                    ? 'bg-stone-800 border-emerald-500/60 text-emerald-400'
                    : 'bg-stone-800/40 border-stone-800 hover:bg-stone-800 text-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold">Recipe Food Costing</div>
                    <div className="text-[10px] text-stone-400">Apicbase template calculator & margins</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-500" />
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => handleTabClick('reports')}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      activeTab === 'reports'
                        ? 'bg-stone-800 border-emerald-500/60 text-emerald-400'
                        : 'bg-stone-800/40 border-stone-800 hover:bg-stone-800 text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold">Reports & Financial Analytics</div>
                        <div className="text-[10px] text-stone-400">Daily Z-Read & Monthly P&L</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500" />
                  </button>

                  <button
                    onClick={() => handleTabClick('security')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                  activeTab === 'security'
                    ? 'bg-stone-800 border-emerald-500/60 text-emerald-400'
                    : 'bg-stone-800/40 border-stone-800 hover:bg-stone-800 text-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold">Security, RBAC & Backup</div>
                    <div className="text-[10px] text-stone-400">AES-256 encrypted archives & staff PINs</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-500" />
                  </button>
                </>
              )}
            </div>

            {/* Quick Staff & Branch Settings inside drawer */}
            <div className="pt-3 border-t border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Current Staff:</span>
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    onOpenPinModal();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 rounded-md text-stone-200 font-medium"
                >
                  <div className={`w-2 h-2 rounded-full ${currentStaff.avatarColor}`} />
                  <span>{currentStaff.name} ({currentStaff.role})</span>
                  <Lock className="w-3 h-3 text-stone-400 ml-1" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Store Branch:</span>
                <select
                  value={currentLocation.id}
                  onChange={(e) => {
                    const selected = locations.find((l) => l.id === e.target.value);
                    if (selected) onSelectLocation(selected);
                  }}
                  className="bg-stone-800 border border-stone-700 rounded-md px-2 py-1 text-xs font-medium text-stone-200 focus:outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name.split('·')[1]?.trim() || loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-stone-400">Network Simulation:</span>
                <button
                  onClick={onToggleOffline}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                    isOffline
                      ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {isOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                  <span>{isOffline ? 'Offline Mode' : 'Cloud Sync Live'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
