import Dexie from "../helpers/dixie.js";

export const data = {
  settings: {
    theme: "system",
    locale: "en",
    currentSession: 1,
    defaultWalletId: 1,
    currencySymbol: "৳",
    pinLockEnabled: false,
    pinCode: "",
    lockMode: "none",
    biometricCredentialId: "",
    netWorthHidden: false,
    profileName: "",
    onboardingCompleted: false,
  },
  wallets: {},
  sessions: {},
  catagories: [],
  persons: [],
};

export const db = new Dexie("jeb-data");

db.version(1).stores({
  settings: "key",
  sessions: "++id, title, isClosed, isStamped",
  wallets: "++id, title",
  transactions: "++id, catagory, source, target, sessionID, type, loanId, feeTxId, isDeleted, dateTime",
  loans: "++id, personId, sessionID, type, status, isDeleted, dateTime",
  persons: "++id, name",
  catagories: "title",
});

export const DEFAULT_CATEGORIES = [
  "food",
  "transport",
  "utilities",
  "shopping",
  "health",
  "transfer fee",
  "adjustment",
  "other",
];

export const TRANSACTION_TYPES = Object.freeze([
  "income",
  "expense",
  "transfer",
  "adjustment",
  "loan_given",
  "loan_borrowed",
  "loan_repaid_to_user",
  "borrowed_repaid_by_user",
]);

export const REGULAR_TRANSACTION_TYPES = Object.freeze([
  "income",
  "expense",
  "transfer",
  "adjustment",
]);

export async function assertSessionWritable(sessionId) {
  const session = await db.sessions.get(Number(sessionId));
  if (session?.isStamped) throw new Error("Stamped sessions are read-only");
}
