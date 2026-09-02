import { db, data, assertSessionWritable } from "./database.js";
import { eventBus } from "./events.js";
import { getCurrentSessionCalculatedData } from "./finance-service.js";
import { recalculateLoanStatus } from "./transaction-service.js";

function personNameFor(loan) {
  return data.persons.find((person) => Number(person.id) === Number(loan.personId))?.name || "Person";
}

export async function addLoan(payload = {}) {
  const personId = Number(payload.personId);
  const source = Number(payload.source);
  if (!data.persons.some((person) => Number(person.id) === personId)) throw new Error("Person not found");
  if (!data.wallets[source]) throw new Error("Wallet not found");
  if (!["given", "borrowed"].includes(payload.type)) throw new Error("Invalid loan type");

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Loan amount must be greater than zero");
  const sessionID = payload.sessionID ? Number(payload.sessionID) : data.settings.currentSession;
  await assertSessionWritable(sessionID);

  if (payload.type === "given") {
    const metrics = await getCurrentSessionCalculatedData();
    if (Number(metrics.currentWalletBalances[source] ?? 0) < amount) throw new Error("Insufficient wallet balance");
  }

  const loanRecord = {
    personId,
    amount,
    dateTime: payload.dateTime || new Date().toISOString(),
    source,
    sessionID,
    note: payload.note || "",
    type: payload.type,
    status: "active",
    isDeleted: false,
  };
  const txType = payload.type === "given" ? "loan_given" : "loan_borrowed";
  const catagory = payload.type === "given" ? "loan given" : "borrowed";
  const note = String(payload.note || "").trim();
  const personName = personNameFor(loanRecord);
  const txNote = payload.type === "given"
    ? `Lent to ${personName}${note ? ` : ${note}` : ""}`
    : `Borrowed from ${personName}${note ? ` : ${note}` : ""}`;

  let loanId;
  let tx;
  await db.transaction("rw", [db.loans, db.transactions, db.catagories], async () => {
    await db.catagories.put({ title: catagory });
    if (!data.catagories.includes(catagory)) data.catagories.push(catagory);
    loanId = await db.loans.add(loanRecord);
    const txRecord = {
      amount,
      dateTime: loanRecord.dateTime,
      catagory,
      source,
      sessionID,
      type: txType,
      note: txNote,
      loanId,
      isDeleted: false,
    };
    const txId = await db.transactions.add(txRecord);
    tx = { id: txId, ...txRecord };
  });

  eventBus.emit("loan:added", { loanId, loanRecord, tx });
  return loanId;
}

export async function addLoanRepayment({ loanId, amount, source, dateTime, note } = {}) {
  const id = Number(loanId);
  const walletId = Number(source);
  const loan = await db.loans.get(id);
  if (!loan || loan.isDeleted) throw new Error("Loan not found or deleted");
  await assertSessionWritable(data.settings.currentSession);
  if (!data.wallets[walletId]) throw new Error("Wallet not found");

  const repaymentAmount = Number(amount);
  if (!Number.isFinite(repaymentAmount) || repaymentAmount <= 0) throw new Error("Repayment amount must be greater than zero");
  if (loan.type === "borrowed") {
    const metrics = await getCurrentSessionCalculatedData();
    if (Number(metrics.currentWalletBalances[walletId] ?? 0) < repaymentAmount) throw new Error("Insufficient wallet balance");
  }
  const previousRepayments = await db.transactions.where("loanId").equals(id).toArray();
  const repaid = previousRepayments
    .filter((transaction) => !transaction.isDeleted && ["loan_repaid_to_user", "borrowed_repaid_by_user"].includes(transaction.type))
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const remaining = Math.max(0, Number(loan.amount) - repaid);
  if (repaymentAmount > remaining) throw new Error("Repayment cannot exceed the remaining loan balance");

  const txType = loan.type === "given" ? "loan_repaid_to_user" : "borrowed_repaid_by_user";
  const catagory = loan.type === "given" ? "loan repayment received" : "borrowed repayment paid";
  const personName = personNameFor(loan);
  const cleanNote = String(note || "").trim();
  const txNote = loan.type === "given"
    ? `Repaid by ${personName}${cleanNote ? ` : ${cleanNote}` : ""}`
    : `Repaid to ${personName}${cleanNote ? ` : ${cleanNote}` : ""}`;

  let tx;
  await db.transaction("rw", [db.transactions, db.catagories, db.loans], async () => {
    await db.catagories.put({ title: catagory });
    if (!data.catagories.includes(catagory)) data.catagories.push(catagory);
    const txRecord = {
      amount: repaymentAmount,
      dateTime: dateTime || new Date().toISOString(),
      catagory,
      source: walletId,
      sessionID: data.settings.currentSession,
      type: txType,
      note: txNote,
      loanId: id,
      isDeleted: false,
    };
    const txId = await db.transactions.add(txRecord);
    tx = { id: txId, ...txRecord };
    await db.loans.update(id, { status: repaymentAmount >= remaining ? "settled" : "active" });
  });

  eventBus.emit("repayment:added", { loanId: id, tx });
  return tx;
}

export async function updateLoan(loanId, payload = {}) {
  const id = Number(loanId);
  const loan = await db.loans.get(id);
  if (!loan || loan.isDeleted) throw new Error("Loan not found or deleted");
  await assertSessionWritable(loan.sessionID);

  const amount = payload.amount !== undefined ? Number(payload.amount) : Number(loan.amount);
  const source = payload.source !== undefined ? Number(payload.source) : Number(loan.source);
  const type = payload.type || loan.type;
  const personId = payload.personId !== undefined ? Number(payload.personId) : Number(loan.personId);
  if (!data.persons.some((person) => Number(person.id) === personId)) throw new Error("Person not found");
  if (!data.wallets[source]) throw new Error("Wallet not found");
  if (!["given", "borrowed"].includes(type)) throw new Error("Invalid loan type");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Loan amount must be greater than zero");

  const linkedTransactions = await db.transactions.where("loanId").equals(id).toArray();
  for (const transaction of linkedTransactions) {
    if (!transaction.isDeleted) await assertSessionWritable(transaction.sessionID);
  }
  const repayments = linkedTransactions.filter((transaction) => !transaction.isDeleted && ["loan_repaid_to_user", "borrowed_repaid_by_user"].includes(transaction.type));
  const repaid = repayments.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  if (amount < repaid) throw new Error("Loan amount cannot be lower than the amount already repaid");

  if (type === "given") {
    const metrics = await getCurrentSessionCalculatedData();
    const restored = Number(loan.source) === source ? Number(loan.amount) : 0;
    if (Number(metrics.currentWalletBalances[source] ?? 0) + restored < amount) throw new Error("Insufficient wallet balance");
  }

  const personName = data.persons.find((person) => Number(person.id) === personId)?.name || "Person";
  const userNote = String(payload.note !== undefined ? payload.note : loan.note || "").trim();
  const updatedLoan = {
    ...loan,
    amount,
    source,
    type,
    personId,
    dateTime: payload.dateTime || loan.dateTime,
    note: payload.note !== undefined ? payload.note : loan.note,
    status: repaid >= amount ? "settled" : "active",
  };
  const originalTx = linkedTransactions.find((transaction) => ["loan_given", "loan_borrowed"].includes(transaction.type));
  await db.transaction("rw", [db.loans, db.transactions, db.catagories], async () => {
    await db.loans.put(updatedLoan);
    const txType = type === "given" ? "loan_given" : "loan_borrowed";
    const category = type === "given" ? "loan given" : "borrowed";
    await db.catagories.put({ title: category });
    if (!data.catagories.includes(category)) data.catagories.push(category);
    if (originalTx) {
      await db.transactions.update(originalTx.id, {
        amount,
        source,
        dateTime: updatedLoan.dateTime,
        type: txType,
        catagory: category,
        note: type === "given" ? `Lent to ${personName}${userNote ? ` : ${userNote}` : ""}` : `Borrowed from ${personName}${userNote ? ` : ${userNote}` : ""}`,
      });
    }
    const repaymentType = type === "given" ? "loan_repaid_to_user" : "borrowed_repaid_by_user";
    const repaymentCategory = type === "given" ? "loan repayment received" : "borrowed repayment paid";
    for (const repayment of repayments) await db.transactions.update(repayment.id, { type: repaymentType, catagory: repaymentCategory });
  });
  eventBus.emit("loan:updated", { loanId: id, loan: updatedLoan });
  return updatedLoan;
}

export async function updateLoanRepayment(transactionId, { amount, source, dateTime, note } = {}) {
  const id = Number(transactionId);
  const transaction = await db.transactions.get(id);
  if (!transaction || transaction.isDeleted || !["loan_repaid_to_user", "borrowed_repaid_by_user"].includes(transaction.type)) throw new Error("Repayment not found");
  const loan = await db.loans.get(Number(transaction.loanId));
  if (!loan || loan.isDeleted) throw new Error("Loan not found or deleted");
  await assertSessionWritable(transaction.sessionID);

  const repaymentAmount = Number(amount);
  const walletId = source !== undefined ? Number(source) : Number(transaction.source);
  if (!Number.isFinite(repaymentAmount) || repaymentAmount <= 0) throw new Error("Repayment amount must be greater than zero");
  if (!data.wallets[walletId]) throw new Error("Wallet not found");
  const allRepayments = await db.transactions.where("loanId").equals(Number(loan.id)).toArray();
  const otherRepaid = allRepayments.filter((item) => !item.isDeleted && item.id !== id && ["loan_repaid_to_user", "borrowed_repaid_by_user"].includes(item.type)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (otherRepaid + repaymentAmount > Number(loan.amount)) throw new Error("Repayment cannot exceed the remaining loan balance");
  if (loan.type === "borrowed") {
    const metrics = await getCurrentSessionCalculatedData();
    const restored = Number(transaction.source) === walletId ? Number(transaction.amount) : 0;
    if (Number(metrics.currentWalletBalances[walletId] ?? 0) + restored < repaymentAmount) throw new Error("Insufficient wallet balance");
  }

  await db.transactions.update(id, { amount: repaymentAmount, source: walletId, dateTime: dateTime || transaction.dateTime, note: note !== undefined ? note : transaction.note });
  await recalculateLoanStatus(loan.id);
  const updated = await db.transactions.get(id);
  eventBus.emit("repayment:updated", { loanId: loan.id, tx: updated });
  return updated;
}

export async function deleteLoan(id) {
  const loanId = Number(id);
  const loan = await db.loans.get(loanId);
  if (loan) await assertSessionWritable(loan.sessionID);
  if (!loan) return;

  const linkedTransactions = await db.transactions.where("loanId").equals(loanId).toArray();
  const activeLinkedTransactions = linkedTransactions.filter((transaction) => !transaction.isDeleted);
  for (const transaction of linkedTransactions) {
    if (!transaction.isDeleted) await assertSessionWritable(transaction.sessionID);
  }
  await db.transaction("rw", [db.loans, db.transactions], async () => {
    await db.loans.update(loanId, { isDeleted: true });
    for (const transaction of activeLinkedTransactions) {
      await db.transactions.update(transaction.id, { isDeleted: true });
    }
  });
  activeLinkedTransactions.forEach((transaction) => {
    eventBus.emit("transaction:deleted", transaction.id);
  });
  eventBus.emit("loan:deleted", loanId);
}
