import { db } from "./database.js";

const REPAYMENT_TYPES = new Set(["loan_repaid_to_user", "borrowed_repaid_by_user"]);
const asArray = (value) => value == null ? [] : Array.isArray(value) ? value : [value];

export async function getTransactions({ sessionIds = [], types = [], categories = [], search = "", includeDeleted = false } = {}) {
  const normalizedSessionIds = asArray(sessionIds);
  const normalizedSessions = normalizedSessionIds.length ? new Set(normalizedSessionIds.map(Number)) : null;
  const normalizedTypes = new Set(asArray(types));
  const normalizedCategories = new Set(asArray(categories));
  const query = String(search || "").trim().toLowerCase();
  const transactions = await db.transactions.toArray();

  return transactions
    .filter((transaction) => {
      if (!includeDeleted && transaction.isDeleted) return false;
      if (normalizedSessions && !normalizedSessions.has(Number(transaction.sessionID))) return false;
      if (normalizedTypes.size && !normalizedTypes.has(transaction.type)) return false;
      if (normalizedCategories.size && !normalizedCategories.has(transaction.catagory)) return false;
      if (query) {
        const searchable = [transaction.catagory, transaction.note, transaction.amount, transaction.type]
          .filter((value) => value != null)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
}

export async function getLoans({ type = null, personId = null, includeDeleted = false } = {}) {
  const [loans, transactions] = await Promise.all([db.loans.toArray(), db.transactions.toArray()]);
  return loans
    .filter((loan) => {
      if (!includeDeleted && loan.isDeleted) return false;
      if (type && loan.type !== type) return false;
      if (personId != null && Number(loan.personId) !== Number(personId)) return false;
      return true;
    })
    .map((loan) => {
      const repayments = transactions.filter((transaction) => !transaction.isDeleted && Number(transaction.loanId) === Number(loan.id) && REPAYMENT_TYPES.has(transaction.type));
      const totalRepaid = repayments.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      return { loan, repayments, totalRepaid, remaining: Math.max(0, Number(loan.amount || 0) - totalRepaid) };
    })
    .sort((a, b) => new Date(b.loan.dateTime) - new Date(a.loan.dateTime));
}
