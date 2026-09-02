import { db, data, assertSessionWritable, REGULAR_TRANSACTION_TYPES, TRANSACTION_TYPES } from "./database.js";
import { eventBus } from "./events.js";
import { getCurrentSessionCalculatedData } from "./finance-service.js";
import { addCategory } from "./entity-service.js";

function normalizeWalletId(value) {
  return value == null ? null : Number(value);
}

function validateWallets(source, target, type) {
  if (source != null && !data.wallets[source]) throw new Error("Source wallet not found");
  if (target != null && !data.wallets[target]) throw new Error("Target wallet not found");
  if (type === "transfer" && (source == null || target == null || source === target)) {
    throw new Error("A transfer needs two different wallets");
  }
}

async function assertSufficientBalance(source, amount, fee = 0) {
  const metrics = await getCurrentSessionCalculatedData();
  const available = Number(metrics.currentWalletBalances[source] ?? 0);
  if (available < amount + fee) throw new Error("Insufficient wallet balance");
}

export async function addTransaction(payload = {}) {
  if (!TRANSACTION_TYPES.includes(payload.type)) throw new Error("Invalid transaction type");

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Transaction amount must be greater than zero");

  const source = normalizeWalletId(payload.source);
  const target = normalizeWalletId(payload.target);
  validateWallets(source, target, payload.type);

  const fee = Number(payload.fee) || 0;
  if (!Number.isFinite(fee) || fee < 0) throw new Error("Transfer fee is invalid");
  if (["expense", "transfer", "loan_given", "borrowed_repaid_by_user"].includes(payload.type)) {
    await assertSufficientBalance(source, amount, payload.type === "transfer" ? fee : 0);
  }

  const transaction = {
    amount,
    dateTime: payload.dateTime || new Date().toISOString(),
    catagory: payload.catagory || "other",
    source,
    target,
    sessionID: payload.sessionID ? Number(payload.sessionID) : data.settings.currentSession,
    type: payload.type,
    note: payload.note || "",
    loanId: payload.loanId ? Number(payload.loanId) : null,
    feeTxId: payload.feeTxId ? Number(payload.feeTxId) : null,
    isIncrease: payload.isIncrease !== false,
    adjustmentType: payload.adjustmentType || null,
    isDeleted: false,
  };
  await assertSessionWritable(transaction.sessionID);

  let id;
  await db.transaction("rw", [db.transactions, db.catagories], async () => {
    if (transaction.type === "transfer" && fee > 0) {
      await db.catagories.put({ title: "transfer fee" });
      if (!data.catagories.includes("transfer fee")) data.catagories.push("transfer fee");
      transaction.feeTxId = await db.transactions.add({
        amount: fee,
        dateTime: transaction.dateTime,
        catagory: "transfer fee",
        source: transaction.source,
        sessionID: transaction.sessionID,
        type: "expense",
        note: `Fee for transfer to ${data.wallets[transaction.target]?.title || "wallet"}`,
        isDeleted: false,
      });
    }
    id = await db.transactions.add(transaction);
  });

  const created = { id, ...transaction };
  eventBus.emit("transaction:added", created);
  return created;
}

export async function updateTransaction(id, payload = {}) {
  const existing = await db.transactions.get(Number(id));
  if (!existing || existing.isDeleted) throw new Error(`Transaction #${id} not found`);
  if (existing.loanId != null) throw new Error("Loan and repayment entries must be edited from the loan record");
  await assertSessionWritable(existing.sessionID);

  const updated = {
    ...existing,
    amount: payload.amount !== undefined ? Number(payload.amount) : existing.amount,
    dateTime: payload.dateTime || existing.dateTime,
    catagory: payload.catagory || existing.catagory,
    source: Object.prototype.hasOwnProperty.call(payload, "source") ? normalizeWalletId(payload.source) : existing.source,
    target: Object.prototype.hasOwnProperty.call(payload, "target") ? normalizeWalletId(payload.target) : existing.target,
    type: payload.type || existing.type,
    note: payload.note !== undefined ? payload.note : existing.note,
    isIncrease: payload.isIncrease !== undefined ? payload.isIncrease !== false : existing.isIncrease,
    adjustmentType: payload.adjustmentType !== undefined ? payload.adjustmentType : existing.adjustmentType,
  };

  if (!REGULAR_TRANSACTION_TYPES.includes(updated.type)) throw new Error("Only regular transactions can be edited");
  if (!Number.isFinite(updated.amount) || updated.amount <= 0) throw new Error("Transaction amount must be greater than zero");
  validateWallets(updated.source, updated.target, updated.type);

  if (updated.type === "expense" || updated.type === "transfer") {
    const previous = await getCurrentSessionCalculatedData();
    const existingFee = existing.feeTxId ? await db.transactions.get(Number(existing.feeTxId)) : null;
    const restoredOutgoing = existing.source === updated.source && existing.source != null
      ? (existing.type === "expense" ? Number(existing.amount) : existing.type === "transfer" ? Number(existing.amount) + Number(existingFee?.amount || 0) : 0)
      : 0;
    const available = Number(previous.currentWalletBalances[updated.source] ?? 0) + restoredOutgoing;
    const fee = updated.type === "transfer"
      ? payload.fee !== undefined ? Math.max(0, Number(payload.fee) || 0) : Number(existingFee?.amount || 0)
      : 0;
    if (available < updated.amount + fee) throw new Error("Insufficient wallet balance");
  }

  await db.transaction("rw", [db.transactions, db.catagories], async () => {
    await db.transactions.put(updated);

    if (updated.type === "transfer" && payload.fee !== undefined) {
      const feeValue = Number(payload.fee) || 0;
      if (existing.feeTxId) {
        if (feeValue > 0) {
          await db.transactions.update(Number(existing.feeTxId), { amount: feeValue, source: updated.source, dateTime: updated.dateTime, isDeleted: false });
        } else {
          await db.transactions.update(Number(existing.feeTxId), { isDeleted: true });
        }
      } else if (feeValue > 0) {
        await db.catagories.put({ title: "transfer fee" });
        if (!data.catagories.includes("transfer fee")) data.catagories.push("transfer fee");
        const feeId = await db.transactions.add({
          amount: feeValue,
          dateTime: updated.dateTime,
          catagory: "transfer fee",
          source: updated.source,
          sessionID: updated.sessionID,
          type: "expense",
          note: `Fee for transfer to ${data.wallets[updated.target]?.title || "wallet"}`,
          isDeleted: false,
        });
        updated.feeTxId = feeId;
        await db.transactions.update(updated.id, { feeTxId: feeId });
      }
    } else if (updated.type !== "transfer" && existing.feeTxId) {
      await db.transactions.update(Number(existing.feeTxId), { isDeleted: true });
      updated.feeTxId = null;
      await db.transactions.update(updated.id, { feeTxId: null });
    }
  });

  eventBus.emit("transaction:updated", updated);
  return updated;
}

export async function addAdjustmentTransaction({ amount, source, note, isIncrease }) {
  await addCategory("adjustment");
  return addTransaction({
    amount: Number(amount),
    source: Number(source),
    type: "adjustment",
    catagory: "adjustment",
    note: note || "Cash count adjustment",
    isIncrease: isIncrease !== false,
  });
}

export async function deleteTransaction(id) {
  const transaction = await db.transactions.get(Number(id));
  if (!transaction) return;
  await assertSessionWritable(transaction.sessionID);
  const feeTransaction = transaction.feeTxId
    ? await db.transactions.get(Number(transaction.feeTxId))
    : null;
  if (feeTransaction) await assertSessionWritable(feeTransaction.sessionID);
  await db.transaction("rw", [db.transactions], async () => {
    await db.transactions.update(Number(id), { isDeleted: true });
    if (feeTransaction) await db.transactions.update(Number(feeTransaction.id), { isDeleted: true });
  });
  if (transaction.loanId != null && ["loan_repaid_to_user", "borrowed_repaid_by_user"].includes(transaction.type)) {
    await recalculateLoanStatus(transaction.loanId);
  }
  eventBus.emit("transaction:deleted", Number(id));
}

export async function recalculateLoanStatus(loanId) {
  const id = Number(loanId);
  const loan = await db.loans.get(id);
  if (!loan || loan.isDeleted) return;
  const repayments = await db.transactions.where("loanId").equals(id).toArray();
  const repaid = repayments
    .filter((transaction) => !transaction.isDeleted && ["loan_repaid_to_user", "borrowed_repaid_by_user"].includes(transaction.type))
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  await db.loans.update(id, { status: repaid >= Number(loan.amount) ? "settled" : "active" });
}
