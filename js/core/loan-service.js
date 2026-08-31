import { db, data, assertSessionWritable } from "./database.js";
import { eventBus } from "./events.js";
import { getCurrentSessionCalculatedData } from "./finance-service.js";
import { deleteTransaction } from "./transaction-service.js";

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

export async function deleteLoan(id) {
  const loanId = Number(id);
  const loan = await db.loans.get(loanId);
  if (loan) await assertSessionWritable(loan.sessionID);
  if (!loan) return;

  await db.loans.update(loanId, { isDeleted: true });
  const linkedTransactions = await db.transactions.where("loanId").equals(loanId).toArray();
  for (const transaction of linkedTransactions) await deleteTransaction(transaction.id);
  eventBus.emit("loan:deleted", loanId);
}
