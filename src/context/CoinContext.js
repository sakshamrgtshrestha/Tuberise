/**
 * CoinContext — Firestore-backed coin balance
 *
 * - Fetches coinBalance from Firestore on mount and whenever the
 *   logged-in user changes (no more mockData).
 * - addCoins / spendCoins write through to Firestore first, then
 *   update local state so the UI stays in sync.
 * - refreshCoins() re-fetches from Firestore at any time (e.g. after
 *   an admin adjusts a user's balance).
 * - Keeps the same context shape (coinBalance, formattedBalance,
 *   addCoins, spendCoins, transactions) so no other file needs changing.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUserData, updateCoins } from '../services/userService';

const CoinContext = createContext(null);

export function CoinProvider({ children }) {
  const { user } = useAuth();

  const [coinBalance, setCoinBalance]   = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loadingCoins, setLoadingCoins] = useState(false);

  // ── Fetch current balance from Firestore ────────────────────────────────────
  const refreshCoins = useCallback(async () => {
    if (!user?.email) {
      setCoinBalance(0);
      return;
    }
    try {
      setLoadingCoins(true);
      const data = await getUserData(user.email);
      if (data && typeof data.coins === 'number') {
        setCoinBalance(data.coins);
      }
    } catch (error) {
      console.error('[CoinContext] Failed to fetch coins from Firestore:', error);
    } finally {
      setLoadingCoins(false);
    }
  }, [user?.email]);

  // Re-fetch whenever the signed-in user changes
  useEffect(() => {
    refreshCoins();
  }, [refreshCoins]);

  // ── Add coins (write to Firestore first, then update local state) ───────────
  const addCoins = async (amount, reason = '') => {
    if (!user?.email || amount <= 0) return;
    try {
      await updateCoins(user.email, amount);          // Firestore increment
      setCoinBalance(prev => prev + amount);          // optimistic local update
      setTransactions(prev => [
        { id: Date.now(), amount: +amount, reason, timestamp: new Date().toISOString() },
        ...prev,
      ]);
    } catch (error) {
      console.error('[CoinContext] addCoins error:', error);
      // Roll back optimistic update by re-fetching real value
      refreshCoins();
    }
  };

  // ── Spend coins (check balance, write to Firestore, update local state) ─────
  const spendCoins = async (amount, reason = '') => {
    if (!user?.email) return false;
    if (coinBalance < amount) return false;           // insufficient funds
    try {
      await updateCoins(user.email, -amount);         // Firestore decrement
      setCoinBalance(prev => prev - amount);          // optimistic local update
      setTransactions(prev => [
        { id: Date.now(), amount: -amount, reason, timestamp: new Date().toISOString() },
        ...prev,
      ]);
      return true;
    } catch (error) {
      console.error('[CoinContext] spendCoins error:', error);
      refreshCoins();  // resync on failure
      return false;
    }
  };

  const formattedBalance = coinBalance.toLocaleString();

  return (
    <CoinContext.Provider
      value={{
        coinBalance,
        formattedBalance,
        addCoins,
        spendCoins,
        transactions,
        loadingCoins,
        refreshCoins,
      }}
    >
      {children}
    </CoinContext.Provider>
  );
}

export const useCoins = () => useContext(CoinContext);
