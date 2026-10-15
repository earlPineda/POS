import React from 'react';
import { Ingredient, StoreLocation } from '../types/pos';
import { AlertTriangle, Cloud, CloudOff, RefreshCw } from 'lucide-react';

interface SubHeaderToolbarProps {
  locations: StoreLocation[];
  currentLocation: StoreLocation;
  onSelectLocation: (loc: StoreLocation) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  pendingSyncCount: number;
  onForceSync: () => void;
  isSyncing: boolean;
  lowStockItems: Ingredient[];
  onNavigateToInventory: () => void;
}

export const SubHeaderToolbar: React.FC<SubHeaderToolbarProps> = ({
  locations,
  currentLocation,
  onSelectLocation,
  isOffline,
  onToggleOffline,
  pendingSyncCount,
  onForceSync,
  isSyncing,
  lowStockItems,
  onNavigateToInventory,
}) => {
  return (
    <div className="bg-stone-100 border-b border-stone-200 px-2.5 sm:px-6 py-1.5 sm:py-2.5 flex flex-wrap items-center justify-between gap-1.5 sm:gap-4 text-xs text-stone-700">
      {/* Branch & Sync Status */}
      <div className="flex items-center gap-1.5 sm:gap-4 flex-wrap w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-stone-500 font-medium hidden sm:inline">Store:</span>
          <select
            value={currentLocation.id}
            onChange={(e) => {
              const selected = locations.find((l) => l.id === e.target.value);
              if (selected) onSelectLocation(selected);
            }}
            className="bg-white border border-stone-300 rounded-md px-2 py-1 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[130px] sm:max-w-none truncate"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name.split('·')[1]?.trim() || loc.name} ({loc.code})
              </option>
            ))}
          </select>
        </div>

        <div className="h-4 w-[1px] bg-stone-300 hidden sm:block" />

        {/* Offline / Online simulator switch */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onToggleOffline}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md border text-[11px] sm:text-xs font-medium transition-colors cursor-pointer ${
              isOffline
                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
            title="Toggle network connectivity simulation to test offline local storage & sync queue"
          >
            {isOffline ? <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" /> : <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
            <span className="hidden sm:inline">{isOffline ? 'Offline Mode Active' : 'Online Cloud Storage'}</span>
            <span className="sm:hidden">{isOffline ? 'Offline' : 'Cloud Sync'}</span>
          </button>

          {pendingSyncCount > 0 && (
            <button
              onClick={onForceSync}
              disabled={isOffline || isSyncing}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium border transition-colors ${
                isOffline
                  ? 'bg-stone-200 text-stone-500 border-stone-300 cursor-not-allowed'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50 hover:text-stone-900 shadow-xs cursor-pointer'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-600' : 'text-stone-500'}`} />
              <span>
                {isSyncing ? 'Syncing...' : `Sync (${pendingSyncCount})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 text-amber-800 bg-amber-50 px-2 sm:px-2.5 py-1 rounded-md border border-amber-200 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold text-amber-900">
              {lowStockItems.length} Low Stock:
            </span>
            <span className="truncate max-w-[140px] sm:max-w-[220px]">
              {lowStockItems.map((i) => i.name.split(' (')[0]).join(', ')}
            </span>
          </div>
          <button
            onClick={onNavigateToInventory}
            className="ml-1 text-emerald-700 hover:text-emerald-800 font-bold underline underline-offset-2 shrink-0 cursor-pointer"
          >
            Restock
          </button>
        </div>
      )}
    </div>
  );
};
