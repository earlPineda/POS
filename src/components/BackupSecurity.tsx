import React, { useState } from 'react';
import { decryptBackup, encryptBackup } from '../utils/crypto';
import { Ingredient, MenuItem, OfflineSyncItem, Order, RecipeTemplate, StaffUser, StoreLocation } from '../types/pos';
import { Database, Download, Key, Lock, RefreshCw, Shield, ShieldAlert, ShieldCheck, Upload } from 'lucide-react';

interface BackupSecurityProps {
  staffList: StaffUser[];
  currentStaff: StaffUser;
  onUpdateStaffList: (staff: StaffUser[]) => void;
  allData: {
    orders: Order[];
    ingredients: Ingredient[];
    recipes: RecipeTemplate[];
    menuItems: MenuItem[];
    locations: StoreLocation[];
  };
  onRestoreData: (restored: any) => void;
  syncQueue: OfflineSyncItem[];
  onForceSync: () => void;
}

export const BackupSecurity: React.FC<BackupSecurityProps> = ({
  staffList,
  currentStaff,
  onUpdateStaffList,
  allData,
  onRestoreData,
  syncQueue,
  onForceSync,
}) => {
  void staffList;
  void currentStaff;
  void onUpdateStaffList;
  // Backup only — staff membership is fixed (admin + staff PIN accounts),
  // so no staff add/edit/delete UI is offered here.
  const [activeTab, setActiveTab] = useState<'backup' | 'cloud_sync'>('backup');

  // Backup State
  const [passphrase, setPassphrase] = useState<string>('MatchaSecure2026!');
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  // Restore State
  const [restorePassphrase, setRestorePassphrase] = useState<string>('');
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  // Generate AES-256-GCM Encrypted Backup
  const handleExportEncryptedBackup = async () => {
    if (!passphrase) {
      setBackupStatus('Error: Please provide a secure passphrase for backup encryption.');
      setTimeout(() => setBackupStatus(null), 4000);
      return;
    }

    try {
      setIsEncrypting(true);
      setBackupStatus('Generating AES-256-GCM encrypted container...');

      const payload = {
        meta: {
          app: 'Matcha Classic POS & Inventory',
          exportTimestamp: new Date().toISOString(),
          version: '2.1.0',
        },
        staff: staffList,
        ...allData,
      };

      const encryptedJson = await encryptBackup(payload, passphrase);

      // Download as .mpos.enc
      const blob = new Blob([encryptedJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `matcha_pos_backup_encrypted_${new Date().toISOString().split('T')[0]}.mpos.enc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setBackupStatus('Encrypted backup successfully exported with AES-256-GCM!');
      setTimeout(() => setBackupStatus(null), 5000);
    } catch (e: any) {
      setBackupStatus(`Encryption failed: ${e.message}`);
      setTimeout(() => setBackupStatus(null), 5000);
    } finally {
      setIsEncrypting(false);
    }
  };

  // Handle Restore file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRestoreFileContent(event.target?.result as string);
        setRestoreError(null);
      };
      reader.readAsText(file);
    }
  };

  // Decrypt and Restore
  const handleDecryptAndRestore = async () => {
    if (!restoreFileContent || !restorePassphrase) {
      setRestoreError('Please select a backup file and enter the correct passphrase.');
      return;
    }

    try {
      setIsDecrypting(true);
      setRestoreError(null);
      const decrypted = await decryptBackup(restoreFileContent, restorePassphrase);

      if (!decrypted.orders || !decrypted.ingredients) {
        throw new Error('Corrupted or unrecognized backup data structure.');
      }

      onRestoreData(decrypted);
      setRestoreSuccess('Data restored successfully! All orders, recipes, and stocks synchronized.');
      setTimeout(() => setRestoreSuccess(null), 5000);
    } catch (e: any) {
      setRestoreError(e.message || 'Decryption failed.');
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 lg:pb-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-700" />
            <span>Security & Encrypted Backups</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
            Web Crypto AES-256 data backups and multi-location cloud sync (admin only)
          </p>
        </div>

        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg overflow-x-auto no-scrollbar touch-scroll max-w-full">
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'backup' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Encrypted Backups
          </button>
          <button
            onClick={() => setActiveTab('cloud_sync')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'cloud_sync' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Cloud Redundancy ({syncQueue.length})
          </button>
        </div>
      </div>

      {/* Encrypted Backups Tab */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-stone-900">Create Encrypted Backup Archive</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Encrypts all store branches, recipe food cost formulas, real-time inventory balances, and staff accounts using military-grade AES-256-GCM.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Encryption Passphrase (Required to restore)
                </label>
                <input
                  type="text"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-stone-900 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-lg text-stone-500 text-[11px] space-y-1">
                <div>• Algorithm: AES-GCM (256-bit key length)</div>
                <div>• Key Derivation: PBKDF2 with SHA-256 & 100,000 iterations</div>
                <div>• Container: Authenticated ciphertext with randomized IV & salt</div>
              </div>

              <button
                onClick={handleExportEncryptedBackup}
                disabled={isEncrypting}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isEncrypting ? 'Encrypting...' : 'Export Encrypted Backup (.mpos.enc)'}</span>
              </button>

              {backupStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-lg font-mono">
                  {backupStatus}
                </div>
              )}
            </div>
          </div>

          {/* Restore Section */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-stone-900">Decrypt & Restore Point-in-Time</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Restore your POS and inventory state from an encrypted backup file. Verifies integrity checksum before applying updates.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Select Backup Archive (.mpos.enc / .json)
                </label>
                <input
                  type="file"
                  accept=".enc,.json"
                  onChange={handleFileChange}
                  className="w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Enter Encryption Passphrase
                </label>
                <input
                  type="password"
                  placeholder="Enter original passphrase"
                  value={restorePassphrase}
                  onChange={(e) => setRestorePassphrase(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded px-3 py-1.5 text-xs font-mono text-stone-900 focus:bg-white"
                />
              </div>

              <button
                onClick={handleDecryptAndRestore}
                disabled={isDecrypting || !restoreFileContent}
                className={`w-full py-2.5 px-4 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs ${
                  !restoreFileContent
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isDecrypting ? 'Verifying & Decrypting...' : 'Decrypt & Restore System'}</span>
              </button>

              {restoreError && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-lg font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{restoreError}</span>
                </div>
              )}

              {restoreSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-lg font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{restoreSuccess}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cloud Sync & Redundancy Tab */}
      {activeTab === 'cloud_sync' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-stone-900">Cloud Storage & Offline Queue Synchronization</h3>
            </div>
            <button
              onClick={onForceSync}
              className="px-3.5 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Force Synchronize All ({syncQueue.length})</span>
            </button>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            When operating during network dropouts, transactions and stock adjustments are secured in an indexed offline queue with zero data loss. Upon reconnection, transactions sync automatically.
          </p>

          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <div className="p-3 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-700">
              Pending Sync Queue Items ({syncQueue.length})
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-stone-100 text-xs">
              {syncQueue.length === 0 ? (
                <div className="p-6 text-center text-stone-400">
                  All local sales and stock adjustments are fully in sync with central cloud storage!
                </div>
              ) : (
                syncQueue.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-stone-900">Type: {item.type}</div>
                      <div className="text-[11px] text-stone-500 font-mono">ID: {item.id} · Queued {new Date(item.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-mono font-bold px-2 py-0.5 rounded uppercase">
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
