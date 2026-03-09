
// utils.ts
// Fix: 引入 React 以解決型別定義中找不到 'React' 命名空間的問題
import React, { useState, useEffect, useRef } from 'react';

// --- IndexedDB 核心封裝 ---
const DB_NAME = 'BOTC_Universal_Tool_DB';
const STORE_NAME = 'app_data';

const getIDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const setItemIDB = async (key: string, value: any) => {
  const db = await getIDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const getItemIDB = async (key: string) => {
  const db = await getIDB();
  return new Promise<any>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * 圖片優化工具
 */
export const getOptimizedImageUrl = (originalUrl: string, options: any = {}): string => {
  if (!originalUrl || !originalUrl.startsWith('http') || originalUrl.includes('images.weserv.nl')) return originalUrl || '';
  const { width, height, quality = 80 } = options;
  const cleanUrl = originalUrl.replace(/^(https?:\/\/)/, '');
  return `https://images.weserv.nl/?url=${cleanUrl}&w=${width || ''}&h=${height || ''}&q=${quality}&output=webp`;
};

/**
 * 大容量持久化 Hook (支援 localStorage 與 IndexedDB 混合儲存)
 * 用於解決 5MB 限制問題
 * 優化：增加資料類型檢查，防止白屏
 */
export function useAppStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  // 1. 初始化讀取
  useEffect(() => {
    async function init() {
      try {
        // 先嘗試從 IndexedDB 讀取 (大容量)
        let item = await getItemIDB(key);
        
        // 若 IDB 沒資料 (undefined 或 null)，嘗試從舊的 localStorage 遷移
        if (item === undefined || item === null) {
            const legacyItem = window.localStorage.getItem(key);
            if (legacyItem !== null) {
                try {
                    item = JSON.parse(legacyItem);
                    console.log(`[Storage] Migrated "${key}" from LocalStorage to IndexedDB`);
                } catch (e) {
                    console.error(`[Storage] Failed to parse legacy item for "${key}", resetting to initial value.`);
                    item = initialValue;
                }
            }
        }

        // 資料驗證與設定
        if (item !== undefined && item !== null) {
          // 強制類型檢查：如果初始值是陣列，讀取的值也必須是陣列
          // 這能有效防止 "map is not a function" 導致的白屏
          if (Array.isArray(initialValue) && !Array.isArray(item)) {
             console.warn(`[Storage] Data mismatch for "${key}". Expected Array, got ${typeof item}. Resetting to initial value to prevent crash.`);
             setStoredValue(initialValue);
          } else {
             setStoredValue(item);
          }
        } else {
            // 如果讀取結果無效，確保使用初始值
            setStoredValue(initialValue);
        }
      } catch (error) {
        console.error(`[Storage] Failed to read "${key}":`, error);
        // 發生錯誤時保持初始值，避免狀態設為 undefined
        setStoredValue(initialValue);
      } finally {
        setIsLoading(false);
        isInitialized.current = true;
      }
    }
    init();
  }, [key]);

  // 2. 變更寫入
  useEffect(() => {
    if (!isInitialized.current) return;

    async function persist() {
      try {
        await setItemIDB(key, storedValue);
        // 同時保留一份 metadata 在 localStorage 以利快速偵測 (選用)
        if (typeof storedValue === 'object' && storedValue !== null) {
            const meta = Array.isArray(storedValue) ? { length: storedValue.length } : { updated: Date.now() };
            window.localStorage.setItem(`${key}_meta`, JSON.stringify(meta));
        }
      } catch (error) {
        console.error(`[Storage] Failed to persist "${key}":`, error);
      }
    }
    persist();
  }, [key, storedValue]);

  return [storedValue, setStoredValue, isLoading];
}

/**
 * 兼容舊版的同步 Hook (僅用於 UI 狀態等小資料)
 * 優化：增加 try-catch 防止惡意/損壞的 localStorage 資料導致崩潰
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;
      return JSON.parse(item);
    } catch (error) {
      console.warn(`[Storage] Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`[Storage] Error writing localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
