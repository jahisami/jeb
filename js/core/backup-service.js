import { db, data } from "./database.js";
import { eventBus } from "./events.js";
import { init } from "./bootstrap.js";

const TABLE_NAMES = ["settings", "sessions", "wallets", "transactions", "loans", "persons", "catagories"];

export async function exportDatabase() {
  return {
    schemaVersion: 1,
    appVersion: "1.1.0",
    exportDate: new Date().toISOString(),
    settings: await db.settings.toArray(),
    sessions: await db.sessions.toArray(),
    wallets: await db.wallets.toArray(),
    transactions: await db.transactions.toArray(),
    loans: await db.loans.toArray(),
    persons: await db.persons.toArray(),
    catagories: await db.catagories.toArray(),
  };
}

function assertImportPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid backup file");
  if (payload.schemaVersion !== 1) throw new Error("Unsupported backup schema");
  for (const table of TABLE_NAMES) {
    if (!Array.isArray(payload[table])) throw new Error(`Backup is missing ${table}`);
  }
}

export async function importDatabase(payload) {
  assertImportPayload(payload);
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
      if (payload[table.name]) await table.bulkAdd(payload[table.name]);
    }
  });
  await init();
  eventBus.emit("db:imported");
}

export async function mergeDatabase(payload) {
  assertImportPayload(payload);
  await db.transaction("rw", db.tables, async () => {
    const walletMap = new Map();
    const personMap = new Map();
    const sessionMap = new Map();
    const loanMap = new Map();

    const wallets = await db.wallets.toArray();
    for (const wallet of payload.wallets) {
      const title = String(wallet.title || "Wallet").trim();
      const existing = wallets.find((item) => item.title.trim().toLowerCase() === title.toLowerCase());
      const id = existing ? existing.id : await db.wallets.add({ title, initialAmount: Number(wallet.initialAmount) || 0 });
      walletMap.set(Number(wallet.id), id);
    }

    const persons = await db.persons.toArray();
    for (const person of payload.persons) {
      const name = String(person.name || "Person").trim();
      const existing = persons.find((item) => item.name.trim().toLowerCase() === name.toLowerCase());
      const id = existing ? existing.id : await db.persons.add({ name });
      personMap.set(Number(person.id), id);
    }

    for (const category of payload.catagories) {
      if (category?.title) await db.catagories.put({ title: String(category.title).trim().toLowerCase() });
    }

    const currentSessionIds = await db.sessions.toCollection().primaryKeys();
    const importedSessionIds = payload.sessions.map((session) => Number(session.id) || 0);
    let nextSessionId = Math.max(0, ...currentSessionIds, ...importedSessionIds) + 1;
    for (const session of [...payload.sessions].sort((a, b) => Number(a.id) - Number(b.id))) {
      const { id: _ignored, ...fields } = session;
      const newId = await db.sessions.add({ ...fields, id: nextSessionId++, isStamped: false, stampedSummary: undefined });
      sessionMap.set(Number(session.id), newId);
    }

    for (const loan of payload.loans) {
      const { id: _ignored, ...fields } = loan;
      const newId = await db.loans.add({
        ...fields,
        personId: personMap.get(Number(loan.personId)),
        source: walletMap.get(Number(loan.source)),
        sessionID: sessionMap.get(Number(loan.sessionID)) || data.settings.currentSession,
      });
      loanMap.set(Number(loan.id), newId);
    }

    const transactionMap = new Map();
    for (const transaction of payload.transactions) {
      const { id: _ignored, ...fields } = transaction;
      const newId = await db.transactions.add({
        ...fields,
        source: transaction.source == null ? null : walletMap.get(Number(transaction.source)),
        target: transaction.target == null ? null : walletMap.get(Number(transaction.target)),
        sessionID: sessionMap.get(Number(transaction.sessionID)) || data.settings.currentSession,
        loanId: transaction.loanId == null ? null : loanMap.get(Number(transaction.loanId)),
        feeTxId: null,
      });
      transactionMap.set(Number(transaction.id), newId);
    }
    for (const transaction of payload.transactions) {
      if (transaction.feeTxId != null && transactionMap.has(Number(transaction.id))) {
        await db.transactions.update(transactionMap.get(Number(transaction.id)), { feeTxId: transactionMap.get(Number(transaction.feeTxId)) || null });
      }
    }
  });
  await init();
  eventBus.emit("db:imported");
}

export async function validateDatabase() {
  const errors = [];
  const [transactions, loans, wallets] = await Promise.all([
    db.transactions.toArray(),
    db.loans.toArray(),
    db.wallets.toArray(),
  ]);
  const walletIds = new Set(wallets.map((wallet) => Number(wallet.id)));
  const loanIds = new Set(loans.map((loan) => Number(loan.id)));

  for (const transaction of transactions) {
    if (Number(transaction.amount) <= 0 && !transaction.isDeleted) errors.push({ type: "INVALID_AMOUNT", id: transaction.id, message: `Transaction #${transaction.id} has invalid amount (${transaction.amount})` });
    if (transaction.source != null && !walletIds.has(Number(transaction.source)) && !transaction.isDeleted) errors.push({ type: "ORPHAN_TRANSACTION", id: transaction.id, message: `Transaction #${transaction.id} references missing wallet source ID ${transaction.source}` });
    if (transaction.target != null && !walletIds.has(Number(transaction.target)) && !transaction.isDeleted) errors.push({ type: "ORPHAN_TRANSACTION", id: transaction.id, message: `Transaction #${transaction.id} references missing wallet target ID ${transaction.target}` });
    if (transaction.loanId != null && !loanIds.has(Number(transaction.loanId)) && !transaction.isDeleted) errors.push({ type: "ORPHAN_TRANSACTION", id: transaction.id, message: `Transaction #${transaction.id} references missing loan ID ${transaction.loanId}` });
  }
  for (const loan of loans) {
    if (Number(loan.amount) <= 0 && !loan.isDeleted) errors.push({ type: "INVALID_LOAN_AMOUNT", id: loan.id, message: `Loan #${loan.id} has invalid amount (${loan.amount})` });
    if (!walletIds.has(Number(loan.source)) && !loan.isDeleted) errors.push({ type: "ORPHAN_LOAN", id: loan.id, message: `Loan #${loan.id} references missing wallet ID ${loan.source}` });
  }
  return { valid: errors.length === 0, errors };
}

export async function repairDatabaseErrors() {
  const audit = await validateDatabase();
  if (audit.valid) return { repairedCount: 0, errorsFixed: [] };
  const errorsFixed = [];
  const repairedTransactions = new Set();
  const repairedLoans = new Set();
  for (const error of audit.errors) {
    if (error.id != null && error.type !== "ORPHAN_LOAN" && error.type !== "INVALID_LOAN_AMOUNT" && !repairedTransactions.has(Number(error.id))) {
      const transactionId = Number(error.id);
      await db.transactions.update(transactionId, { isDeleted: true });
      repairedTransactions.add(transactionId);
      errorsFixed.push(`Soft-deleted invalid transaction #${transactionId}`);
    }
    if (error.id != null && ["ORPHAN_LOAN", "INVALID_LOAN_AMOUNT"].includes(error.type) && !repairedLoans.has(Number(error.id))) {
      const loanId = Number(error.id);
      await db.loans.update(loanId, { isDeleted: true });
      const linkedTransactions = await db.transactions.where("loanId").equals(loanId).toArray();
      for (const transaction of linkedTransactions) await db.transactions.update(transaction.id, { isDeleted: true });
      repairedLoans.add(loanId);
      errorsFixed.push(`Soft-deleted invalid loan #${loanId} and linked transactions`);
    }
  }
  eventBus.emit("db:repaired", errorsFixed);
  return { repairedCount: errorsFixed.length, errorsFixed };
}

export async function createPreOperationBackup() {
  const backup = await exportDatabase();
  try {
    localStorage.setItem("jeb_backup_pre_import", JSON.stringify(backup));
  } catch (error) {
    console.warn("Pre-import localStorage backup failed:", error);
  }
  return backup;
}

export async function wipeDatabase() {
  await db.delete();
  eventBus.emit("db:wiped");
  if (typeof location !== "undefined") location.reload();
}
