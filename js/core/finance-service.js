import { db, data } from "./database.js";
import { calculateSessionMetrics } from "./calculator.js";

export async function getCurrentSessionCalculatedData() {
  const currentSessionId = data.settings.currentSession;
  // const stampedSessions = await db.sessions.where("isStamped").equals(true).toArray();
  // const lastStamped = stampedSessions.sort((a, b) => b.id - a.id)[0];

  // FIX: Use .filter() instead of indexed .where().equals(true)
  const stampedSessions = await db.sessions
    .filter((session) => Boolean(session.isStamped))
    .toArray();

  const lastStamped = stampedSessions.sort((a, b) => b.id - a.id)[0];

  let initialWalletBalances = {};
  let startSessionId = 1;
  if (lastStamped?.stampedSummary) {
    initialWalletBalances = {
      ...lastStamped.stampedSummary.currentWalletBalances,
    };
    startSessionId = lastStamped.id + 1;
  }
  Object.values(data.wallets).forEach((wallet) => {
    if (initialWalletBalances[wallet.id] === undefined)
      initialWalletBalances[wallet.id] = Number(wallet.initialAmount) || 0;
  });

  const [allTransactions, allLoans] = await Promise.all([
    db.transactions.toArray(),
    db.loans.toArray(),
  ]);
  const activeTransactions = allTransactions.filter(
    (tx) =>
      !tx.isDeleted &&
      Number(tx.sessionID) >= startSessionId &&
      Number(tx.sessionID) <= Number(currentSessionId),
  );
  return calculateSessionMetrics({
    targetSessionId: currentSessionId,
    transactions: activeTransactions,
    loans: allLoans,
    allTransactions,
    initialWalletBalances,
  });
}

export async function getSessionSummary(sessionIds = []) {
  const ids = (Array.isArray(sessionIds) ? sessionIds : [sessionIds])
    .map(Number)
    .sort((a, b) => a - b);
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id < 1))
    throw new Error("At least one valid session is required");

  if (ids.length === 1) {
    const session = await db.sessions.get(ids[0]);
    if (session?.isStamped && session.stampedSummary)
      return session.stampedSummary;
  }

  const [allTransactions, allLoans] = await Promise.all([
    db.transactions.toArray(),
    db.loans.toArray(),
  ]);
  const rangeTransactions = allTransactions.filter(
    (tx) => !tx.isDeleted && ids.includes(Number(tx.sessionID)),
  );
  const minSessionId = ids[0];
  const previousSession = await db.sessions.get(minSessionId - 1);
  let initialWalletBalances = {};

  if (previousSession?.isStamped && previousSession.stampedSummary) {
    initialWalletBalances = {
      ...previousSession.stampedSummary.currentWalletBalances,
    };
  } else {
    Object.values(data.wallets).forEach((wallet) => {
      initialWalletBalances[wallet.id] = Number(wallet.initialAmount) || 0;
    });
    const priorTransactions = allTransactions.filter(
      (tx) => !tx.isDeleted && Number(tx.sessionID) < minSessionId,
    );
    if (priorTransactions.length) {
      initialWalletBalances = calculateSessionMetrics({
        targetSessionId: minSessionId - 1,
        transactions: priorTransactions,
        loans: allLoans,
        allTransactions,
        initialWalletBalances,
      }).currentWalletBalances;
    }
  }
  Object.values(data.wallets).forEach((wallet) => {
    if (initialWalletBalances[wallet.id] === undefined)
      initialWalletBalances[wallet.id] = Number(wallet.initialAmount) || 0;
  });
  return calculateSessionMetrics({
    targetSessionId: ids[ids.length - 1],
    transactions: rangeTransactions,
    loans: allLoans,
    allTransactions,
    initialWalletBalances,
  });
}
