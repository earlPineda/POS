import React from 'react';
import { StaffUser, StoreLocation } from '../types/pos';
import { Lock, Store, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentStaff: StaffUser;
  onOpenPinModal: () => void;
  currentLocation: StoreLocation;
  isOffline: boolean;
  pendingSyncCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentStaff,
  onOpenPinModal,
  currentLocation,
  isOffline,
  pendingSyncCount,
}) => {
  const isAdmin = currentStaff.role === 'admin';
  // Staff must never see sales — Reports & Security tabs are admin-only.
  const navItems = [
    { id: 'register', label: 'Register' },
    { id: 'orders', label: 'Orders & KDS' },
    { id: 'inventory', label: 'Inventory & Alerts' },
    { id: 'recipes', label: 'Recipe Costing' },
    ...(isAdmin
      ? [
          { id: 'reports', label: 'Reports & Analytics' },
          { id: 'security', label: 'Security & Backup' },
        ]
      : []),
  ];

  return (
    <header className="flex items-center justify-between gap-3 sm:gap-8 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-stone-900 text-stone-100 border-b border-stone-800 shrink-0 select-none">
      {/* Zone 1: Brand title, one line */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs sm:text-sm text-white shadow-sm">
          M
        </div>
        <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
          Matcha Avenue Café
        </span>
      </div>

      {/* Zone 2: 4-5 nav links, 1-2 word labels, single-line */}
      <nav className="hidden lg:flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-stone-800 text-emerald-400 font-semibold shadow-inner'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action / staff lock affordance */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 text-xs text-stone-300">
          <Store className="w-3.5 h-3.5 text-stone-400 hidden sm:inline" />
          <span className="whitespace-nowrap font-medium text-stone-200 hidden sm:inline">{currentLocation.code}</span>
          <span className="text-stone-600 hidden sm:inline">·</span>
          {isOffline ? (
            <span
              className="flex items-center gap-1 text-amber-400 font-mono text-[10px] sm:text-[11px] bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800"
              title={`Simulated Offline (${pendingSyncCount} pending)`}
            >
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span className="hidden xs:inline">Offline</span> ({pendingSyncCount})
            </span>
          ) : (
            <span
              className="flex items-center gap-1 text-emerald-400 font-mono text-[10px] sm:text-[11px] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/80"
              title="Cloud Connected"
            >
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="hidden xs:inline">Live</span>
            </span>
          )}
        </div>

        <button
          onClick={onOpenPinModal}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs font-medium text-stone-100 bg-stone-800 hover:bg-stone-700 active:scale-95 border border-stone-700 rounded-lg transition-all whitespace-nowrap cursor-pointer"
          title="Switch Staff or Lock Terminal"
        >
          <div className={`w-2 h-2 rounded-full ${currentStaff.avatarColor}`} />
          <span className="text-xs whitespace-nowrap">{currentStaff.name}</span>
          <span className="hidden md:inline text-[10px] text-stone-400 uppercase tracking-wider font-mono">({currentStaff.role})</span>
          <Lock className="w-3 h-3 text-stone-400" />
        </button>
      </div>
    </header>
  );
};
