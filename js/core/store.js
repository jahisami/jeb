// Compatibility facade for the application layer.
// New code should import the focused service it needs directly.
export { data, db } from "./database.js";
export { init } from "./bootstrap.js";
export { completeOnboarding } from "./onboarding-service.js";
export {
  addPerson,
  updatePerson,
  deletePerson,
  addCategory,
  updateCategory,
  deleteCategory,
  addWallet,
  updateSettings,
} from "./entity-service.js";
export {
  addTransaction,
  updateTransaction,
  addAdjustmentTransaction,
  deleteTransaction,
} from "./transaction-service.js";
export { addLoan, addLoanRepayment, updateLoan, updateLoanRepayment, deleteLoan } from "./loan-service.js";
export { getCurrentSessionCalculatedData, getSessionSummary } from "./finance-service.js";
export { getTransactions, getLoans } from "./query-service.js";
export { createNewSession, renameSession, stampSession } from "./session-service.js";
export {
  validateDatabase,
  repairDatabaseErrors,
  createPreOperationBackup,
  exportDatabase,
  importDatabase,
  mergeDatabase,
  wipeDatabase,
} from "./backup-service.js";

// DOM cache retained here only for backwards compatibility with older UI code.
export const elements = {
  get tabHistoryButton() { return typeof document !== "undefined" ? document.querySelector(".tab-button-gen.history") : null; },
  get tabWalletsButton() { return typeof document !== "undefined" ? document.querySelector(".tab-button-gen.wallets") : null; },
  get tabLoansButton() { return typeof document !== "undefined" ? document.querySelector(".tab-button-gen.loans") : null; },
  get tabFabButton() { return typeof document !== "undefined" ? document.querySelector(".tab-fab") : null; },
  get dashDropdown() { return typeof document !== "undefined" ? document.querySelector(".dash-balance-dropdown") : null; },
  get dashSummaryBtn() { return typeof document !== "undefined" ? document.querySelector("button.dash-summary") : null; },
  get dashExpenseCont() { return typeof document !== "undefined" ? document.querySelector(".dash-amount-item.expense .dash-sec-amount") : null; },
  get dashPayableCont() { return typeof document !== "undefined" ? document.querySelector(".dash-amount-item.payable .dash-sec-amount") : null; },
  get dashReceivableCont() { return typeof document !== "undefined" ? document.querySelector(".dash-amount-item.receivable .dash-sec-amount") : null; },
  get transactionHeaderDropdown() { return typeof document !== "undefined" ? document.querySelector("button.th-header") : null; },
  get historyInSelector() { return typeof document !== "undefined" ? document.querySelector(".lc-in-out-selector-group .selectable.in") : null; },
  get historyOutSelector() { return typeof document !== "undefined" ? document.querySelector(".lc-in-out-selector-group .selectable.out") : null; },
  get historyCatagorySelector() { return typeof document !== "undefined" ? document.querySelector(".lc-in-out-selector-group .selector.catagory") : null; },
  get transactionHistory() { return typeof document !== "undefined" ? document.querySelector(".th-list") : null; },
};
