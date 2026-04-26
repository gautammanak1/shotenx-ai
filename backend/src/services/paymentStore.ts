import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { CheckoutSession, PaymentLogEntry } from "../types";

type PaymentStoreFile = {
  sessions: Record<string, CheckoutSession>;
  usedPaymentHashes: Record<string, string>;
  logs: PaymentLogEntry[];
};

const DB_PATH =
  process.env.PAYMENTS_DB_PATH?.trim() ||
  path.resolve(process.cwd(), "data", "payments.json");

let cache: PaymentStoreFile | null = null;

const emptyStore = (): PaymentStoreFile => ({
  sessions: {},
  usedPaymentHashes: {},
  logs: []
});

const ensureDbLoaded = () => {
  if (cache) return cache;

  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(DB_PATH)) {
    cache = emptyStore();
    fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2), "utf8");
    return cache;
  }

  const raw = fs.readFileSync(DB_PATH, "utf8").trim();
  if (!raw) {
    cache = emptyStore();
    return cache;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PaymentStoreFile>;
    cache = {
      sessions: parsed.sessions ?? {},
      usedPaymentHashes: parsed.usedPaymentHashes ?? {},
      logs: parsed.logs ?? []
    };
  } catch {
    cache = emptyStore();
  }

  return cache;
};

const persist = () => {
  if (!cache) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2), "utf8");
};

export const paymentStore = {
  upsertSession(session: CheckoutSession) {
    const store = ensureDbLoaded();
    store.sessions[session.id] = session;
    persist();
    return session;
  },

  getSession(checkoutId: string) {
    const store = ensureDbLoaded();
    return store.sessions[checkoutId];
  },

  listSessions() {
    const store = ensureDbLoaded();
    return Object.values(store.sessions);
  },

  markHashUsed(paymentHash: string, checkoutId: string) {
    const store = ensureDbLoaded();
    const owner = store.usedPaymentHashes[paymentHash];
    if (owner && owner !== checkoutId) {
      return false;
    }
    store.usedPaymentHashes[paymentHash] = checkoutId;
    persist();
    return true;
  },

  hasHashBeenUsed(paymentHash: string) {
    const store = ensureDbLoaded();
    return Boolean(store.usedPaymentHashes[paymentHash]);
  },

  addLog(log: Omit<PaymentLogEntry, "id">) {
    const store = ensureDbLoaded();
    const entry: PaymentLogEntry = {
      id: randomUUID(),
      ...log
    };
    store.logs.push(entry);
    if (store.logs.length > 5000) {
      store.logs = store.logs.slice(-5000);
    }
    persist();
    return entry;
  },

  listLogs(limit = 100) {
    const store = ensureDbLoaded();
    return store.logs.slice(-Math.max(1, limit)).reverse();
  }
};
