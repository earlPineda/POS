import React, { useEffect, useState } from 'react';
import { StaffUser } from '../types/pos';
import { Delete, KeyRound, Shield, X } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffUser[];
  currentStaff: StaffUser;
  onSelectStaff: (user: StaffUser) => void;
  requiredRole?: 'admin' | 'manager' | null;
  onSuccess?: () => void;
}

/**
 * PIN-only login — no profile picker.
 * Type the 4-digit PIN and the matching account signs in automatically.
 * Reports & full sales history stay admin-only (PIN 1990); staff (PIN 0202)
 * can only ring up sales at the register.
 */
export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentStaff,
  onSelectStaff,
  requiredRole,
  onSuccess,
}) => {
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset the keypad every time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setEnteredPin('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setErrorMessage(null);
      if (next.length === 4) {
        verifyPin(next);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setEnteredPin('');
    setErrorMessage(null);
  };

  const verifyPin = (pin: string) => {
    // PIN-only lookup — no profile needs to be selected first.
    const user = staffList.find((u) => u.pin === pin) ?? null;
    if (!user) {
      setErrorMessage('Incorrect PIN. Please re-enter.');
      setEnteredPin('');
      return;
    }
    if (requiredRole) {
      const roleRank = { admin: 3, manager: 2, cashier: 1, barista: 1 };
      const requiredRank = roleRank[requiredRole];
      const userRank = roleRank[user.role];
      if (userRank < requiredRank) {
        setErrorMessage(`Access denied: requires ${requiredRole.toUpperCase()} privilege.`);
        setEnteredPin('');
        return;
      }
    }

    onSelectStaff(user);
    setEnteredPin('');
    setErrorMessage(null);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-stone-200 max-w-md w-full max-h-[92dvh] flex flex-col overflow-hidden my-auto animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-sm">
              {requiredRole ? `Manager Authorization Required` : 'Staff Authentication & PIN'}
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto overscroll-contain">
          {/* Signed-in account (display only — login is PIN-only, no picker) */}
          <div className="mb-4 sm:mb-5 p-2.5 rounded-lg border border-stone-200 bg-stone-50 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full shrink-0 ${currentStaff.avatarColor}`} />
            <div className="truncate">
              <div className="text-xs font-semibold text-stone-900 truncate">
                Signed in: {currentStaff.name}
              </div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 capitalize">
                {currentStaff.role} — enter a PIN below to switch accounts
              </div>
            </div>
          </div>

          {/* PIN Display */}
          <div className="text-center mb-4 sm:mb-5">
            <div className="text-xs text-stone-500 mb-2 flex items-center justify-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-stone-400" />
              <span>Enter 4-digit PIN to sign in</span>
            </div>
            <div className="flex justify-center gap-3 my-2">
              {[0, 1, 2, 3].map((idx) => {
                const hasValue = enteredPin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 transition-all ${
                      hasValue ? 'bg-emerald-600 border-emerald-600 scale-110' : 'border-stone-300 bg-white'
                    }`}
                  />
                );
              })}
            </div>
            {errorMessage && (
              <p className="text-xs text-rose-600 font-medium mt-1.5 animate-shake">{errorMessage}</p>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleDigit(digit)}
                className="h-11 sm:h-12 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-lg font-semibold active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-11 sm:h-12 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              CLEAR
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="h-11 sm:h-12 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-lg font-semibold active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-11 sm:h-12 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Hint: PINs are secret — staff PIN signs in staff, admin PIN signs in admin. */}
          <div className="mt-4 pt-3 border-t border-stone-200 text-center">
            <p className="text-[11px] text-stone-500">
              {requiredRole
                ? `This action requires ${requiredRole.toUpperCase()} authorization.`
                : 'Type your 4-digit PIN — the matching account signs in automatically.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
