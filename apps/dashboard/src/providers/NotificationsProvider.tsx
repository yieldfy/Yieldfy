import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type NotificationLevel = "info" | "success" | "warning" | "error";

export type Notification = {
  id: string;
  level: NotificationLevel;
  title: string;
  body?: string;
  href?: string;
  createdAt: number;
  read: boolean;
};

type NotificationsContextValue = {
  items: Notification[];
  unreadCount: number;
  push: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  clear: () => void;
  remove: (id: string) => void;
};

const STORAGE_KEY = "yieldfy:notifications";
const MAX = 50;

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const readInitial = (): Notification[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedItems();
    const parsed = JSON.parse(raw) as Notification[];
    if (!Array.isArray(parsed)) return seedItems();
    return parsed;
  } catch {
    return seedItems();
  }
};

const seedItems = (): Notification[] => [
  {
    id: crypto.randomUUID(),
    level: "info",
    title: "Welcome to Yieldfy",
    body: "Phase B is live — wXRP deposits mint yXRP 1:1 and are fully withdrawable.",
    createdAt: Date.now(),
    read: false,
  },
];

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Notification[]>(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const push = useCallback<NotificationsContextValue["push"]>((n) => {
    setItems((prev) => {
      const next: Notification = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        read: false,
        ...n,
      };
      return [next, ...prev].slice(0, MAX);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const value = useMemo<NotificationsContextValue>(
    () => ({ items, unreadCount, push, markAllRead, clear, remove }),
    [items, unreadCount, push, markAllRead, clear, remove],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
