// helpers/calculator.js

export function roundMoney(val) {
  const num = Number(val) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates metrics for a specific target session or range of sessions.
 * Enforces the rule: Repayments on older session loans affect wallet cash flow,
 * but do NOT reduce current session Payables/Receivables.
 */
export function calculateSessionMetrics({
  targetSessionId,
  transactions = [],
  loans = [],
  allTransactions = [], // Needed to check all repayments for session loans
  initialWalletBalances = {},
}) {
  const activeTxs = transactions.filter((tx) => !tx.isDeleted);
  const activeLoans = loans.filter((l) => !l.isDeleted);
  const globalActiveTxs = allTransactions.filter((tx) => !tx.isDeleted);

  let totalInflow = 0;
  let totalOutflow = 0;
  let totalExpense = 0; // Includes regular expenses + loans given
  let totalRealExpense = 0; // Excludes loans given, includes user loan repayments
  let totalLoansGiven = 0;
  let totalLoansReceived = 0;
  let totalRepaymentDone = 0;
  let totalRepaymentReceived = 0;

  // Normalize initial wallet balances to numeric keys
  const currentWalletBalances = {};
  Object.keys(initialWalletBalances).forEach((k) => {
    currentWalletBalances[Number(k)] = roundMoney(initialWalletBalances[k]);
  });

  const categoryExpense = {};

  activeTxs.forEach((tx) => {
    const amount = roundMoney(tx.amount);
    const sourceId = tx.source != null ? Number(tx.source) : null;
    const targetId = tx.target != null ? Number(tx.target) : null;

    // --- 1. Wallet Balance Updates ---
    if (tx.type === "transfer") {
      if (sourceId !== null && currentWalletBalances[sourceId] !== undefined) {
        currentWalletBalances[sourceId] = roundMoney(currentWalletBalances[sourceId] - amount);
      }
      if (targetId !== null && currentWalletBalances[targetId] !== undefined) {
        currentWalletBalances[targetId] = roundMoney(currentWalletBalances[targetId] + amount);
      }
    } else if (tx.type === "adjustment") {
      if (sourceId !== null && currentWalletBalances[sourceId] !== undefined) {
        if (tx.isIncrease !== false && tx.adjustmentType !== "decrease") {
          currentWalletBalances[sourceId] = roundMoney(currentWalletBalances[sourceId] + amount);
        } else {
          currentWalletBalances[sourceId] = roundMoney(currentWalletBalances[sourceId] - amount);
        }
      }
    } else {
      if (sourceId !== null && currentWalletBalances[sourceId] !== undefined) {
        if (
          ["income", "loan_borrowed", "loan_repaid_to_user"].includes(tx.type)
        ) {
          currentWalletBalances[sourceId] = roundMoney(currentWalletBalances[sourceId] + amount);
        } else if (
          ["expense", "loan_given", "borrowed_repaid_by_user"].includes(tx.type)
        ) {
          currentWalletBalances[sourceId] = roundMoney(currentWalletBalances[sourceId] - amount);
        }
      }
    }

    // --- 2. Inflow / Outflow & Category Breakdown ---
    switch (tx.type) {
      case "income":
        totalInflow = roundMoney(totalInflow + amount);
        break;

      case "expense":
        totalOutflow = roundMoney(totalOutflow + amount);
        totalExpense = roundMoney(totalExpense + amount);
        totalRealExpense = roundMoney(totalRealExpense + amount);
        categoryExpense[tx.catagory] = roundMoney(
          (categoryExpense[tx.catagory] || 0) + amount
        );
        break;

      case "loan_given":
        totalOutflow = roundMoney(totalOutflow + amount);
        totalLoansGiven = roundMoney(totalLoansGiven + amount);
        totalExpense = roundMoney(totalExpense + amount);
        break;

      case "loan_borrowed":
        totalInflow = roundMoney(totalInflow + amount);
        totalLoansReceived = roundMoney(totalLoansReceived + amount);
        break;

      case "borrowed_repaid_by_user":
        totalOutflow = roundMoney(totalOutflow + amount);
        totalRepaymentDone = roundMoney(totalRepaymentDone + amount);
        totalRealExpense = roundMoney(totalRealExpense + amount);
        break;

      case "loan_repaid_to_user":
        totalInflow = roundMoney(totalInflow + amount);
        totalRepaymentReceived = roundMoney(totalRepaymentReceived + amount);
        break;

      case "adjustment":
        if (tx.isIncrease !== false && tx.adjustmentType !== "decrease") {
          totalInflow = roundMoney(totalInflow + amount);
        } else {
          totalOutflow = roundMoney(totalOutflow + amount);
        }
        break;

      case "transfer":
        break;
    }
  });

  // --- 3. Session Payables & Receivables Calculation ---
  let totalPayable = 0;
  let totalReceivable = 0;

  const sessionLoans = activeLoans.filter(
    (l) => Number(l.sessionID) === Number(targetSessionId),
  );

  sessionLoans.forEach((loan) => {
    // Sum ALL repayments ever made against this loan across time
    const repayments = globalActiveTxs.filter(
      (tx) =>
        Number(tx.loanId) === Number(loan.id) &&
        (tx.type === "loan_repaid_to_user" ||
          tx.type === "borrowed_repaid_by_user"),
    );

    const totalRepaid = repayments.reduce(
      (sum, tx) => roundMoney(sum + (Number(tx.amount) || 0)),
      0,
    );
    const remaining = Math.max(0, roundMoney(Number(loan.amount || 0) - totalRepaid));

    if (loan.type === "borrowed") {
      totalPayable = roundMoney(totalPayable + remaining);
    } else if (loan.type === "given") {
      totalReceivable = roundMoney(totalReceivable + remaining);
    }
  });

  return {
    initialWalletBalances,
    currentWalletBalances,
    totalInflow: roundMoney(totalInflow),
    totalOutflow: roundMoney(totalOutflow),
    totalExpense: roundMoney(totalExpense),
    totalRealExpense: roundMoney(totalRealExpense),
    totalPayable: roundMoney(totalPayable),
    totalReceivable: roundMoney(totalReceivable),
    totalLoansGiven: roundMoney(totalLoansGiven),
    totalLoansReceived: roundMoney(totalLoansReceived),
    totalRepaymentDone: roundMoney(totalRepaymentDone),
    totalRepaymentReceived: roundMoney(totalRepaymentReceived),
    categoryExpense,
  };
}

/**
 * Checks if a closed session meets the 20-day stamping condition:
 * 1. Session is closed.
 * 2. Successor session is closed.
 * 3. Session end date is at least 20 days ago.
 */
export function shouldStampSession(session, successorSession) {
  if (!session || !session.isClosed || session.isStamped) return false;
  if (!successorSession || !successorSession.isClosed) return false;

  const TWENTY_DAYS_MS = 20 * 24 * 60 * 60 * 1000;
  const closedDuration = Date.now() - new Date(session.endDate).getTime();

  return closedDuration >= TWENTY_DAYS_MS;
}
