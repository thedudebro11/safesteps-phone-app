// src/lib/storage.ts
import { Platform } from "react-native";

type StorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let memoryStore: Record<string, string> = {};

async function getAsyncStorage(): Promise<any | null> {
  // Avoid hard dependency if not installed.
  try {
    const mod = await import("@react-native-async-storage/async-storage");
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

export async function getStorage(): Promise<StorageLike> {
  // Web: localStorage is simple and reliable
  if (Platform.OS === "web") {
    return {
      async getItem(key) {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      async setItem(key, value) {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          // ignore
        }
      },
      async removeItem(key) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore
        }
      },
    };
  }

  // Native: prefer AsyncStorage if installed
  const AsyncStorage = await getAsyncStorage();
  if (AsyncStorage) {
    return {
      getItem: AsyncStorage.getItem,
      setItem: AsyncStorage.setItem,
      removeItem: AsyncStorage.removeItem,
    };
  }

  // Fallback: in-memory (still functional)
  return {
    async getItem(key) {
      return memoryStore[key] ?? null;
    },
    async setItem(key, value) {
      memoryStore[key] = value;
    },
    async removeItem(key) {
      delete memoryStore[key];
    },
  };
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const storage = await getStorage();
  const raw = await storage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  const storage = await getStorage();
  await storage.setItem(key, JSON.stringify(value));
}
