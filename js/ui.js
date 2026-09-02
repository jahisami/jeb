// ui.js - Primary UI Controller & Event Binder
import { eventBus } from "./core/events.js";
import { data, db } from "./core/database.js";
import {
  getCurrentSessionCalculatedData,
  getSessionSummary,
} from "./core/finance-service.js";
import {
  createNewSession,
  renameSession,
  stampSession,
} from "./core/session-service.js";
import {
  addTransaction,
  updateTransaction,
  addAdjustmentTransaction,
  deleteTransaction,
} from "./core/transaction-service.js";
import {
  addWallet,
  addPerson,
  updatePerson,
  deletePerson,
  addCategory,
  updateCategory,
  deleteCategory,
  updateSettings,
} from "./core/entity-service.js";
import {
  addLoan,
  addLoanRepayment,
  updateLoan,
  updateLoanRepayment,
  deleteLoan,
} from "./core/loan-service.js";
import { completeOnboarding } from "./core/onboarding-service.js";
import {
  validateDatabase,
  repairDatabaseErrors,
  createPreOperationBackup,
  exportDatabase,
  importDatabase,
  mergeDatabase,
  wipeDatabase,
} from "./core/backup-service.js";
import {
  locale,
  getLocale,
  setLocale,
  updateDOMTranslations,
} from "./core/locale.js";
import { formatNumber, formatDate, escapeHtml } from "./ui/formatters.js";
import { getTransactions, getLoans } from "./core/query-service.js";

// --- Active View State ---
let selectedViewSessionId = null; // null means active currentSession
let sessionWindowSessionId = null;
let selectedMainWalletId = null;
let activeNavTab = "history";
let currentTxFilters = { types: [], categories: [], search: "" };
let sessionHistoryFilters = { types: [], categories: [], search: "" };
let currentLoanFilters = { type: null, personId: null };
let selectedTransactionId = null;
let editingLoanId = null;
let editingRepaymentId = null;

// Form Selection Temporary States
let formTxState = {
  type: "expense",
  catagory: "other",
  walletId: 1,
  targetId: null,
};
let formEditTxState = {
  id: null,
  type: "expense",
  catagory: "other",
  walletId: 1,
  targetId: null,
};
let formLoanState = { type: "given", personId: null, walletId: 1 };
let formRepaymentState = { loanId: null, walletId: 1 };
let stagedImportPayload = null;

// Security PIN Buffer
let pinInputBuffer = "";

// --- Initialize UI ---
export function initUI() {
  bindNavigation();
  bindSheetModals();
  bindFormControls();
  bindPickerOverlay();
  bindFilters();
  bindSessionHistoryFilters();
  bindTransactionActions();
  bindLoanActionsMenu();
  bindSessionAndSettings();
  bindPinLockKeypad();
  bindEntityManagers();
  bindStarterPage();
  bindStoreEvents();
}

// --- Store Events Listener ---
function bindStoreEvents() {
  eventBus.on("store:initialized", async () => {
    selectedMainWalletId = data.settings.defaultWalletId || 1;
    formTxState.walletId = selectedMainWalletId;
    formLoanState.walletId = selectedMainWalletId;
    formRepaymentState.walletId = selectedMainWalletId;

    if (data.settings.locale && data.settings.locale !== getLocale())
      setLocale(data.settings.locale);
    updateDOMTranslations();
    applyTheme(data.settings.theme);
    updateGreeting();
    checkPinLockOnBoot();

    await refreshAllViews();
    if (!data.settings.onboardingCompleted) showStarterPage();
  });

  const refreshEvents = [
    "transaction:added",
    "transaction:updated",
    "transaction:deleted",
    "wallet:added",
    "loan:added",
    "loan:updated",
    "loan:deleted",
    "repayment:added",
    "repayment:updated",
    "settings:updated",
    "category:added",
    "category:updated",
    "category:deleted",
    "person:added",
    "person:updated",
    "person:deleted",
    "session:created",
    "session:renamed",
    "session:stamped",
    "onboarding:completed",
    "db:imported",
  ];

  let refreshTimeout = null;
  refreshEvents.forEach((evt) => {
    eventBus.on(evt, () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(async () => {
        await refreshAllViews();
      }, 10);
    });
  });
}

// --- Refresh UI Views ---
export async function refreshAllViews() {
  await renderDashboard();
  await renderTransactionHistory();
  await renderWalletsList();
  await renderLoansList();
  updateFormSelectorLabels();
}

// --- Navigation & Tab Bar ---
function bindNavigation() {
  const historyBtn = document.getElementById("navHistoryTab");
  const walletsBtn = document.getElementById("navWalletsTab");
  const loansBtn = document.getElementById("navLoansTab");
  const fabBtn = document.getElementById("navFabBtn");

  const walletsModal = document.getElementById("walletsTabModal");
  const loansModal = document.getElementById("loansTabModal");

  historyBtn?.addEventListener("click", () => {
    activeNavTab = "history";
    setActiveNavTab(historyBtn);
    closeAllSheets();
  });

  walletsBtn?.addEventListener("click", () => {
    activeNavTab = "wallets";
    setActiveNavTab(walletsBtn);
    closeAllSheets();
    openSheet(walletsModal);
  });

  loansBtn?.addEventListener("click", () => {
    activeNavTab = "loans";
    setActiveNavTab(loansBtn);
    closeAllSheets();
    openSheet(loansModal);
  });

  fabBtn?.addEventListener("click", () => {
    resetDateTimeInputs();
    if (activeNavTab === "wallets") {
      resetWalletForm();
      openSheet(document.getElementById("addWalletModal"));
    } else if (activeNavTab === "loans") {
      resetLoanForm();
      openSheet(document.getElementById("addLoanModal"));
    } else {
      resetTransactionForm();
      openSheet(document.getElementById("addTransactionModal"));
    }
  });
}

function setActiveNavTab(activeBtn) {
  document
    .querySelectorAll(".tab-button-gen")
    .forEach((btn) => btn.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
}

// --- Sheet Modal Handlers ---
function bindSheetModals() {
  const modals = document.querySelectorAll(".floating-tab");
  const historyBtn = document.getElementById("navHistoryTab");
  const walletsModal = document.getElementById("walletsTabModal");
  const loansModal = document.getElementById("loansTabModal");

  modals.forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeSheet(modal);
        if (modal === loansModal || modal === walletsModal) {
          activeNavTab = "history";
          setActiveNavTab(historyBtn);
        }
      }
    });
  });

  document
    .getElementById("dashSummaryBtn")
    ?.addEventListener("click", async () => {
      sessionWindowSessionId =
        selectedViewSessionId || data.settings.currentSession;
      setSessionWindowTab("summary");
      await renderSessionSummary();
      openSheet(document.getElementById("sessionSummaryModal"));
    });

  document
    .getElementById("dashWalletDropdownBtn")
    ?.addEventListener("click", async () => {
      const options = Object.values(data.wallets).map((w) => ({
        id: w.id,
        title: w.title,
      }));
      showPicker(
        locale("selectWallet"),
        options,
        selectedMainWalletId,
        async (selected) => {
          await selectMainWallet(selected.id);
        },
        document.getElementById("dashWalletDropdownBtn"),
      );
    });

  document
    .getElementById("thHeaderSessionBtn")
    ?.addEventListener("click", async () => {
      await renderSessionsList();
      openSheet(document.getElementById("sessionsManagerModal"));
    });

  document.getElementById("openMenuBtn")?.addEventListener("click", () => {
    openSheet(document.getElementById("quickMenuModal"));
  });
  document.getElementById("lockAppBtn")?.addEventListener("click", lockApp);
  document.getElementById("quickSettingsBtn")?.addEventListener("click", () => {
    closeSheet(document.getElementById("quickMenuModal"));
    updateSettingsLabels();
    openSheet(document.getElementById("settingsModal"));
  });
  document
    .getElementById("quickCategoriesBtn")
    ?.addEventListener("click", () => {
      closeSheet(document.getElementById("quickMenuModal"));
      renderCategoryManagerList();
      openSheet(document.getElementById("categoryManagerModal"));
    });
  document.getElementById("quickPersonsBtn")?.addEventListener("click", () => {
    closeSheet(document.getElementById("quickMenuModal"));
    renderPersonManagerList();
    openSheet(document.getElementById("personManagerModal"));
  });
  document.getElementById("quickHealthBtn")?.addEventListener("click", () => {
    closeSheet(document.getElementById("quickMenuModal"));
    document.getElementById("runHealthCheckBtn")?.click();
  });
  document
    .getElementById("quickLanguageBtn")
    ?.addEventListener("click", async () => {
      const nextLang = getLocale() === "en" ? "bn" : "en";
      setLocale(nextLang);
      data.settings.locale = nextLang;
      await updateSettings({ locale: nextLang });
      await refreshAllViews();
    });

  document
    .getElementById("sessionWindowSummaryTab")
    ?.addEventListener("click", () => {
      setSessionWindowTab("summary");
    });
  document
    .getElementById("sessionWindowHistoryTab")
    ?.addEventListener("click", () => {
      setSessionWindowTab("history");
    });
}

export function openSheet(modal) {
  if (!modal) return;
  modal.classList.remove("hide");
  modal.classList.add("active");
}

export function closeSheet(modal) {
  if (!modal) return;
  modal.classList.add("hide");
  setTimeout(() => {
    modal.classList.remove("active", "hide");
  }, 250);
}

export function closeAllSheets() {
  document
    .querySelectorAll(".floating-tab.active")
    .forEach((modal) => closeSheet(modal));
}

// --- Dashboard Controller ---
async function renderDashboard() {
  const activeSessionId = selectedViewSessionId || data.settings.currentSession;
  const metrics =
    activeSessionId === data.settings.currentSession
      ? await getCurrentSessionCalculatedData()
      : await getSessionSummary([activeSessionId]);

  let walletBalance = 0;
  if (
    selectedMainWalletId &&
    metrics.currentWalletBalances[selectedMainWalletId] !== undefined
  ) {
    walletBalance = metrics.currentWalletBalances[selectedMainWalletId];
  } else {
    walletBalance = Object.values(metrics.currentWalletBalances).reduce(
      (a, b) => a + b,
      0,
    );
  }

  const totalWalletBalance = Object.values(
    metrics.currentWalletBalances,
  ).reduce((a, b) => a + b, 0);
  const symbol = data.settings.currencySymbol || "৳";
  document.getElementById("dashBalanceAmount").textContent =
    `${symbol}${formatNumber(walletBalance)}`;
  document.getElementById("dashExpenseAmount").textContent =
    `${symbol}${formatNumber(metrics.totalExpense)}`;
  document.getElementById("dashPayableAmount").textContent =
    `${symbol}${formatNumber(metrics.totalPayable)}`;
  document.getElementById("dashReceivableAmount").textContent =
    `${symbol}${formatNumber(metrics.totalReceivable)}`;

  const dashWalletTitle = document.getElementById("dashWalletTitle");
  if (selectedMainWalletId && data.wallets[selectedMainWalletId]) {
    dashWalletTitle.textContent = data.wallets[selectedMainWalletId].title;
  } else {
    dashWalletTitle.textContent = locale("mainWalletBalance");
  }

  const currentSessObj = data.sessions[activeSessionId];
  const thHeaderSessionText = document.getElementById("thHeaderSessionText");
  if (thHeaderSessionText) {
    thHeaderSessionText.textContent = currentSessObj
      ? currentSessObj.title + (currentSessObj.isClosed ? " (Closed)" : "")
      : `${locale("currentSession")} #${activeSessionId}`;
  }
}

// --- Render Session Summary Sheet ---
async function renderSessionSummary() {
  const targetSessionId =
    sessionWindowSessionId ||
    selectedViewSessionId ||
    data.settings.currentSession;
  const summary = await getSessionSummary([targetSessionId]);
  const sessObj = data.sessions[targetSessionId];
  const sym = data.settings.currencySymbol || "৳";

  document.getElementById("sessionSummaryTitle").textContent =
    `${sessObj?.title || `${locale("currentSession")} #${targetSessionId}`} ${locale("summary")}`;

  const stampBtn = document.getElementById("sessionStampBtn");
  if (stampBtn) {
    stampBtn.style.display =
      sessObj?.isClosed && !sessObj?.isStamped ? "inline-flex" : "none";
    stampBtn.onclick = async () => {
      try {
        await stampSession(targetSessionId);
        await renderSessionSummary();
      } catch (error) {
        alert(error.message);
      }
    };
  }

  const container = document.getElementById("sessionSummaryContent");
  const catEntries = Object.entries(summary.categoryExpense || {});

  const initialEntries = Object.entries(summary.initialWalletBalances || {});
  const initialTotal = initialEntries.reduce(
    (sum, [, amount]) => sum + Number(amount || 0),
    0,
  );
  const categoryTotal = catEntries.reduce(
    (sum, [, amount]) => sum + Number(amount || 0),
    0,
  );
  container.innerHTML = `
    <section class="summary-section">
      <div class="summary-section-title">${locale("initialBalances")}</div>
      <div class="summary-balance-total"><span>${locale("all")}</span><strong>${sym}${formatNumber(initialTotal)}</strong></div>
      ${initialEntries.map(([walletId, amount]) => `<div class="summary-metric-row"><span>${escapeHtml(data.wallets[walletId]?.title || locale("wallet"))}</span><span>${sym}${formatNumber(amount)}</span></div>`).join("")}
    </section>
    <section class="cat-summary-section">
      <div class="summary-section-title">${locale("categoryExpenses")}</div>
      ${
        catEntries.length === 0
          ? `<div class="empty-sub">${locale("noExpenses")}</div>`
          : catEntries
              .map(([cat, amount]) => {
                const percent = categoryTotal
                  ? Math.round((Number(amount) / categoryTotal) * 100)
                  : 0;
                return `<div class="cat-summary-item"><div class="cat-summary-row"><span class="cs-cat-name">${escapeHtml(cat)}</span><span class="cs-cat-amt">${sym}${formatNumber(amount)} · ${percent}%</span></div><div class="cat-progress-track"><div class="cat-progress-fill" style="width:${percent}%"></div></div></div>`;
              })
              .join("")
      }
    </section>
    <section class="summary-loan-grid">
      <div class="summary-loan-card lent"><span>${locale("lentTotal")}</span><strong>${sym}${formatNumber(summary.totalLoansGiven)}</strong><small>${locale("receivableLeft")}: ${sym}${formatNumber(summary.totalReceivable)}</small></div>
      <div class="summary-loan-card borrowed"><span>${locale("borrowedTotal")}</span><strong>${sym}${formatNumber(summary.totalLoansReceived)}</strong><small>${locale("payableLeft")}: ${sym}${formatNumber(summary.totalPayable)}</small></div>
    </section>
    <section class="summary-card-grid">
      <div class="summary-metric-row"><span>${locale("totalInflow")}</span><span class="sm-value in">+${sym}${formatNumber(summary.totalInflow)}</span></div>
      <div class="summary-metric-row"><span>${locale("totalOutflow")}</span><span class="sm-value out">-${sym}${formatNumber(summary.totalOutflow)}</span></div>
      <div class="summary-metric-row"><span>${locale("realExpenses")}</span><span>${sym}${formatNumber(summary.totalRealExpense)}</span></div>
      <div class="summary-metric-row"><span>${locale("repaymentsDone")}</span><span>${sym}${formatNumber(summary.totalRepaymentDone)}</span></div>
      <div class="summary-metric-row"><span>${locale("repaymentsReceived")}</span><span>${sym}${formatNumber(summary.totalRepaymentReceived)}</span></div>
    </section>
  `;
}

function setSessionWindowTab(tab) {
  const summaryTab = document.getElementById("sessionWindowSummaryTab");
  const historyTab = document.getElementById("sessionWindowHistoryTab");
  const summary = document.getElementById("sessionSummaryContent");
  const history = document.getElementById("sessionWindowHistoryContent");
  const historyFilters = document.querySelector(".session-history-filters");
  const isSummary = tab === "summary";
  summaryTab?.classList.toggle("active", isSummary);
  historyTab?.classList.toggle("active", !isSummary);
  if (summary) summary.style.display = isSummary ? "block" : "none";
  if (history) history.style.display = isSummary ? "none" : "block";
  if (historyFilters)
    historyFilters.style.display = isSummary ? "none" : "flex";
  if (!isSummary) renderSessionWindowHistory();
}

async function renderSessionWindowHistory() {
  const container = document.getElementById("sessionWindowHistoryContent");
  if (!container) return;
  const sessionId =
    sessionWindowSessionId ||
    selectedViewSessionId ||
    data.settings.currentSession;
  const txs = await getTransactions({
    sessionIds: [sessionId],
    types: sessionHistoryFilters.types,
    categories: sessionHistoryFilters.categories,
    search: sessionHistoryFilters.search,
  });
  container.innerHTML = txs.length
    ? txs
        .map(
          (tx) =>
            `<button type="button" class="session-history-entry" data-transaction-id="${Number(tx.id)}">${transactionDetailsMarkup(tx)}</button>`,
        )
        .join("")
    : `<div class="empty-state">${locale("noTransactionsSession")}</div>`;

  // Rebind after using a string template, while keeping the renderer DOM-safe.
  container.querySelectorAll(".session-history-entry").forEach((item) => {
    const txId = Number(item.dataset.transactionId);
    const tx = txs.find((candidate) => Number(candidate.id) === txId);
    if (!tx) return;
    item.addEventListener("click", () => {
      if (tx.loanId != null) {
        alert(locale("loanEntriesManaged"));
        return;
      }
      openTransactionActions(tx);
    });
  });
}

function transactionIsOut(tx) {
  return ["expense", "loan_given", "borrowed_repaid_by_user"].includes(tx.type);
}

function transactionTypeText(type) {
  const labels = {
    income: "income",
    expense: "expense",
    transfer: "transfer",
    adjustment: "adjustment",
    loan_given: "loanGiven",
    loan_borrowed: "loanBorrowed",
    loan_repaid_to_user: "repaymentReceived",
    borrowed_repaid_by_user: "repaymentPaid",
  };
  return locale(labels[type] || "transactionActions");
}

function transactionDetailsMarkup(tx, includeActionData = false) {
  const sym = data.settings.currencySymbol || "৳";
  const sourceName =
    tx.source != null
      ? data.wallets[tx.source]?.title || locale("wallet")
      : "—";
  const targetName =
    tx.target != null
      ? data.wallets[tx.target]?.title || locale("wallet")
      : "—";
  const categoryName = tx.type === "income" ? "—" : tx.catagory || "—";
  const amount = `${transactionIsOut(tx) ? "-" : "+"}${sym}${formatNumber(tx.amount)}`;
  const actionData = includeActionData
    ? ` data-transaction-id="${Number(tx.id)}"`
    : "";
  return `<div class="transaction-detail-content"${actionData}>
    <div class="transaction-detail-heading"><span>${escapeHtml(tx.note || transactionTypeText(tx.type))}</span><strong class="${transactionIsOut(tx) ? "out" : "in"}">${amount}</strong></div>
    <div class="transaction-detail-grid">
      <div class="transaction-detail-row"><span>${locale("transactionTypeLabel")}</span><strong>${escapeHtml(transactionTypeText(tx.type))}</strong></div>
      <div class="transaction-detail-row"><span>${locale("dateTimeLabel")}</span><strong>${escapeHtml(formatDate(tx.dateTime))}</strong></div>
      <div class="transaction-detail-row"><span>${locale("sourceWallet")}</span><strong>${escapeHtml(sourceName)}</strong></div>
      ${tx.target != null ? `<div class="transaction-detail-row"><span>${locale("targetWalletLabel")}</span><strong>${escapeHtml(targetName)}</strong></div>` : ""}
      <div class="transaction-detail-row"><span>${locale("category")}</span><strong>${escapeHtml(categoryName)}</strong></div>
    </div>
    ${tx.note ? `<div class="transaction-detail-note">${escapeHtml(tx.note)}</div>` : ""}
  </div>`;
}

function canEditTransaction(tx) {
  return !data.sessions[Number(tx.sessionID)]?.isStamped;
}

function bindLoanActionsMenu() {
  const button = document.getElementById("loanDetailsMenuBtn");
  const menu = document.getElementById("loanDetailsActionsMenu");
  if (!button || !menu) return;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = menu.classList.toggle("active");
    button.setAttribute("aria-expanded", String(isOpen));
  });
  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && event.target !== button) {
      menu.classList.remove("active");
      button.setAttribute("aria-expanded", "false");
    }
  });
}

function closeLoanActionsMenu() {
  const menu = document.getElementById("loanDetailsActionsMenu");
  const button = document.getElementById("loanDetailsMenuBtn");
  menu?.classList.remove("active");
  button?.setAttribute("aria-expanded", "false");
}

async function openTransactionActions(tx) {
  selectedTransactionId = Number(tx.id);
  const details = document.getElementById("transactionActionDetails");
  if (!details) return;
  details.innerHTML = transactionDetailsMarkup(tx);
  if (tx.feeTxId) {
    const fee = await db.transactions.get(Number(tx.feeTxId));
    if (selectedTransactionId !== Number(tx.id)) return;
    if (fee && !fee.isDeleted) {
      details.insertAdjacentHTML(
        "beforeend",
        `<div class="transaction-detail-row"><span>${locale("transferFee")}</span><strong>${data.settings.currencySymbol || "৳"}${formatNumber(fee.amount)}</strong></div>`,
      );
    }
  }
  const editable = canEditTransaction(tx);
  const editButton = document.getElementById("editSelectedTransactionBtn");
  const deleteButton = document.getElementById("deleteSelectedTransactionBtn");
  if (editButton) editButton.disabled = !editable;
  if (deleteButton) deleteButton.disabled = !editable;
  openSheet(document.getElementById("transactionActionsModal"));
}

function bindTransactionActions() {
  document
    .getElementById("closeTransactionActionsBtn")
    ?.addEventListener("click", () => {
      closeSheet(document.getElementById("transactionActionsModal"));
    });
  document
    .getElementById("editSelectedTransactionBtn")
    ?.addEventListener("click", async () => {
      const tx = selectedTransactionId
        ? await db.transactions.get(selectedTransactionId)
        : null;
      if (!tx || !canEditTransaction(tx)) return;
      closeSheet(document.getElementById("transactionActionsModal"));
      openEditTransactionModal(tx);
    });
  document
    .getElementById("deleteSelectedTransactionBtn")
    ?.addEventListener("click", async () => {
      const tx = selectedTransactionId
        ? await db.transactions.get(selectedTransactionId)
        : null;
      if (!tx || !canEditTransaction(tx)) return;
      if (!confirm(locale("deleteTransactionConfirm"))) return;
      try {
        await deleteTransaction(tx.id);
        closeSheet(document.getElementById("transactionActionsModal"));
        selectedTransactionId = null;
      } catch (error) {
        alert(error.message);
      }
    });
}

function bindSessionHistoryFilters() {
  document
    .getElementById("sessionHistorySearchInput")
    ?.addEventListener("input", (event) => {
      sessionHistoryFilters.search = event.target.value;
      renderSessionWindowHistory();
    });
  document
    .getElementById("sessionHistoryInBtn")
    ?.addEventListener("click", () => {
      sessionHistoryFilters.types = sessionHistoryFilters.types.includes(
        "income",
      )
        ? []
        : ["income"];
      updateSessionHistoryFilterUI();
      renderSessionWindowHistory();
    });
  document
    .getElementById("sessionHistoryOutBtn")
    ?.addEventListener("click", () => {
      sessionHistoryFilters.types = sessionHistoryFilters.types.includes(
        "expense",
      )
        ? []
        : ["expense"];
      updateSessionHistoryFilterUI();
      renderSessionWindowHistory();
    });
  document
    .getElementById("sessionHistoryCategoryBtn")
    ?.addEventListener("click", () => {
      const options = [
        { id: null, title: `${locale("all")} ${locale("categories")}` },
        ...data.catagories.map((category) => ({
          id: category,
          title: category,
        })),
      ];
      showPicker(
        locale("selectCategory"),
        options,
        sessionHistoryFilters.categories,
        (selected, selectedIds) => {
          sessionHistoryFilters.categories = selectedIds;
          updateSessionHistoryFilterUI();
          renderSessionWindowHistory();
        },
        document.getElementById("sessionHistoryCategoryBtn"),
        null,
        true,
      );
    });
  updateSessionHistoryFilterUI();
}

function updateSessionHistoryFilterUI() {
  document
    .getElementById("sessionHistoryInBtn")
    ?.classList.toggle(
      "active",
      sessionHistoryFilters.types.includes("income"),
    );
  document
    .getElementById("sessionHistoryOutBtn")
    ?.classList.toggle(
      "active",
      sessionHistoryFilters.types.includes("expense"),
    );
  const chips = document.getElementById("sessionHistoryFilterChips");
  if (!chips) return;
  chips.innerHTML = "";
  sessionHistoryFilters.categories.forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = category;
    chip.addEventListener("click", () => {
      sessionHistoryFilters.categories =
        sessionHistoryFilters.categories.filter((item) => item !== category);
      updateSessionHistoryFilterUI();
      renderSessionWindowHistory();
    });
    chips.appendChild(chip);
  });
}

// --- Render Sessions Manager Sheet ---
async function renderSessionsList() {
  const container = document.getElementById("sessionsListContainer");
  container.innerHTML = "";

  const allSessions = Object.values(data.sessions).sort((a, b) => b.id - a.id);
  const activeSessId = selectedViewSessionId || data.settings.currentSession;

  allSessions.forEach((sess) => {
    const item = document.createElement("div");
    item.className = `session-item-card ${sess.id === activeSessId ? "active" : ""} ${sess.id === data.settings.currentSession ? "is-current" : ""}`;

    item.innerHTML = `
      <div class="sess-info">
        <div class="sess-title">${escapeHtml(sess.title)} ${sess.id === data.settings.currentSession ? "⚡ (Active)" : ""}</div>
        <div class="sess-sub">${sess.isClosed ? locale("closed") : locale("open")} ${sess.isStamped ? `· ${locale("stamped")}` : ""}</div>
      </div>
      <div class="session-actions"><button type="button" class="sess-rename">${locale("rename")}</button><span class="sess-badge">${sess.id === activeSessId ? locale("viewing") : locale("open")}</span></div>
    `;

    item.addEventListener("click", () => {
      closeSheet(document.getElementById("sessionsManagerModal"));
      if (Number(sess.id) === Number(data.settings.currentSession)) {
        selectedViewSessionId = sess.id;
        sessionWindowSessionId = null;
        refreshAllViews();
      } else {
        sessionWindowSessionId = sess.id;
        setSessionWindowTab("summary");
        renderSessionSummary();
        openSheet(document.getElementById("sessionSummaryModal"));
      }
    });

    item
      .querySelector(".sess-rename")
      ?.addEventListener("click", async (event) => {
        event.stopPropagation();
        const title = prompt(
          `${locale("rename")} ${locale("sessionSummary").toLowerCase()}:`,
          sess.title,
        );
        if (!title || !title.trim()) return;
        await renameSession(sess.id, title);
        await renderSessionsList();
        refreshAllViews();
      });

    container.appendChild(item);
  });
}

// --- Sessions & Settings Handlers ---
function bindSessionAndSettings() {
  document
    .getElementById("createNewSessionBtn")
    ?.addEventListener("click", async () => {
      const title = prompt(
        locale("newSession"),
        `${locale("currentSession")} #${(data.settings.currentSession || 1) + 1}`,
      );
      if (title !== null) {
        const newId = await createNewSession(title);
        selectedViewSessionId = newId;
        closeSheet(document.getElementById("sessionsManagerModal"));
        alert(`${locale("newSession")} ${locale("active")}`);
      }
    });

  document
    .getElementById("settingsDefaultWalletBtn")
    ?.addEventListener("click", () => {
      const options = Object.values(data.wallets).map((w) => ({
        id: w.id,
        title: w.title,
      }));
      showPicker(
        locale("selectMainWallet"),
        options,
        data.settings.defaultWalletId,
        async (selected) => {
          await selectMainWallet(selected.id);
          updateSettingsLabels();
        },
        document.getElementById("settingsDefaultWalletBtn"),
      );
    });

  document
    .getElementById("settingsCurrencyBtn")
    ?.addEventListener("click", async () => {
      const currencies = ["৳", "$", "€", "₹", "£"];
      const current = data.settings.currencySymbol || "৳";
      const nextIdx = (currencies.indexOf(current) + 1) % currencies.length;
      const nextSym = currencies[nextIdx];
      await updateSettings({ currencySymbol: nextSym });
      updateSettingsLabels();
      refreshAllViews();
    });

  document.getElementById("settingsThemeBtn")?.addEventListener("click", () => {
    const options = [
      { id: "system", title: locale("systemDefault") },
      { id: "light", title: locale("lightTheme") },
      { id: "dark", title: locale("darkTheme") },
    ];
    showPicker(
      locale("theme"),
      options,
      data.settings.theme,
      async (selected) => {
        await updateSettings(
          { theme: selected.id },
          document.getElementById("settingsThemeBtn"),
        );
        applyTheme(selected.id);
        updateSettingsLabels();
      },
      document.getElementById("settingsThemeBtn"),
    );
  });

  document.getElementById("settingsPinBtn")?.addEventListener("click", () => {
    const options = [
      { id: "none", title: locale("noLock") },
      { id: "pin", title: locale("pinLock") },
      { id: "biometrics", title: locale("biometrics") },
      { id: "both", title: locale("pinAndBiometrics") },
    ];
    showPicker(
      locale("selectSecurityLock"),
      options,
      getConfiguredLockMode(),
      async (selected) => {
        if (selected.id === "pin") {
          if (!(await configurePin())) return;
          await updateSettings({
            lockMode: "pin",
            pinLockEnabled: true,
            biometricCredentialId: "",
          });
        } else if (selected.id === "biometrics") {
          if (!window.PublicKeyCredential) {
            alert(locale("biometricUnsupported"));
            return;
          }
          const credentialId = await registerBiometric();
          if (!credentialId) return;
          await updateSettings({
            lockMode: "biometrics",
            pinLockEnabled: false,
            biometricCredentialId: credentialId,
          });
        } else if (selected.id === "both") {
          if (!window.PublicKeyCredential) {
            alert(locale("biometricUnsupported"));
            return;
          }
          const credentialId = await registerBiometric();
          if (!credentialId) return;
          if (!(await configurePin())) return;
          await updateSettings({
            lockMode: "both",
            pinLockEnabled: true,
            biometricCredentialId: credentialId,
          });
        } else {
          await updateSettings({
            lockMode: "none",
            pinLockEnabled: false,
          });
        }
        updateSettingsLabels();
      },
      document.getElementById("settingsPinBtn"),
    );
  });

  document
    .getElementById("changePinBtn")
    ?.addEventListener("click", async () => {
      await configurePin();
      updateSettingsLabels();
    });

  document
    .getElementById("runHealthCheckBtn")
    ?.addEventListener("click", async () => {
      const report = await validateDatabase();
      const container = document.getElementById("healthCheckReportContainer");
      const autoRepairBtn = document.getElementById("executeAutoRepairBtn");

      if (report.valid) {
        container.innerHTML = `<div style="color: #10b981; font-weight: 600;">✅ ${locale("healthPassed")}</div>`;
        if (autoRepairBtn) autoRepairBtn.style.display = "none";
      } else {
        container.innerHTML =
          `<div style="color: #ef4444; font-weight: 600; margin-bottom: 8px;">⚠️ ${locale("integrityWarnings")} (${report.errors.length}):</div>` +
          report.errors
            .map(
              (e) =>
                `<div style="padding: 4px 0; border-bottom: 1px #eee solid;">• ${escapeHtml(e.message)}</div>`,
            )
            .join("");
        if (autoRepairBtn) autoRepairBtn.style.display = "inline-flex";
      }
      openSheet(document.getElementById("healthCheckModal"));
    });

  document
    .getElementById("executeAutoRepairBtn")
    ?.addEventListener("click", async () => {
      const res = await repairDatabaseErrors();
      alert(`${locale("fixedErrors")} ${res.repairedCount} error(s).`);
      closeSheet(document.getElementById("healthCheckModal"));
      refreshAllViews();
    });

  document
    .getElementById("closeHealthCheckBtn")
    ?.addEventListener("click", () => {
      closeSheet(document.getElementById("healthCheckModal"));
    });

  document
    .getElementById("exportDbBtn")
    ?.addEventListener("click", async () => {
      const dbData = await exportDatabase();
      const blob = new Blob([JSON.stringify(dbData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jeb-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  const importFileInp = document.getElementById("importFileInput");
  document.getElementById("importDbBtn")?.addEventListener("click", () => {
    importFileInp.click();
  });

  importFileInp?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      stagedImportPayload = JSON.parse(text);
      await createPreOperationBackup();

      const txCount = (stagedImportPayload.transactions || []).length;
      const wCount = (stagedImportPayload.wallets || []).length;
      document.getElementById("stagedImportSummary").textContent =
        `${locale("backupLoaded")} ${txCount} transaction(s), ${wCount} wallet(s).`;

      openSheet(document.getElementById("stagedImportModal"));
    } catch (err) {
      alert("Failed to parse JSON backup file: " + err.message);
    }
  });

  document
    .getElementById("importReplaceAllBtn")
    ?.addEventListener("click", async () => {
      if (!stagedImportPayload) return;
      try {
        await importDatabase(stagedImportPayload);
      } catch (error) {
        alert(error.message);
        return;
      }
      closeSheet(document.getElementById("stagedImportModal"));
      alert(locale("replaceSuccess"));
    });

  document
    .getElementById("importMergeBtn")
    ?.addEventListener("click", async () => {
      if (!stagedImportPayload) return;
      try {
        await mergeDatabase(stagedImportPayload);
      } catch (error) {
        alert(error.message);
        return;
      }
      closeSheet(document.getElementById("stagedImportModal"));
      refreshAllViews();
      alert(locale("mergeSuccess"));
    });

  document.getElementById("importCancelBtn")?.addEventListener("click", () => {
    closeSheet(document.getElementById("stagedImportModal"));
  });

  document.getElementById("wipeDbBtn")?.addEventListener("click", async () => {
    if (confirm(locale("dangerReset"))) {
      await wipeDatabase();
    }
  });
}

function getConfiguredLockMode() {
  const storedMode = data.settings.lockMode;
  if (["none", "pin", "biometrics", "both"].includes(storedMode)) {
    return storedMode;
  }
  return data.settings.pinLockEnabled
    ? "pin"
    : data.settings.biometricCredentialId
      ? "biometrics"
      : "none";
}

function updateSettingsLabels() {
  const defWallet = data.wallets[data.settings.defaultWalletId];
  document.getElementById("settingsDefaultWalletBtn").textContent = defWallet
    ? defWallet.title
    : locale("selectWallet");
  document.getElementById("settingsCurrencyBtn").textContent =
    data.settings.currencySymbol || "৳";
  document.getElementById("settingsThemeBtn").textContent = locale(
    `${data.settings.theme || "system"}Theme`,
  );
  const lockMode = getConfiguredLockMode();
  const lockText =
    lockMode === "both"
      ? `${locale("pinCodeLabel")} + ${locale("biometricsShort")}`
      : lockMode === "biometrics"
        ? `${locale("biometricsShort")} ☝️`
        : lockMode === "pin"
          ? `${locale("pinCodeLabel")} 🔒`
          : locale("disabled");
  document.getElementById("settingsPinBtn").textContent = lockText;
  const changePinRow = document.getElementById("changePinRow");
  if (changePinRow)
    changePinRow.style.display =
      data.settings.pinLockEnabled && data.settings.pinCode ? "flex" : "none";
}

async function configurePin() {
  const pin = prompt(
    data.settings.pinCode ? locale("enterNewPin") : locale("setSecurityPin"),
  );
  if (!pin || !/^\d{4}$/.test(pin)) {
    alert(locale("invalidPin"));
    return false;
  }
  const confirmPin = prompt(locale("confirmNewPin"));
  if (pin !== confirmPin) {
    alert(locale("pinMismatch"));
    return false;
  }
  await updateSettings({
    lockMode: data.settings.biometricCredentialId ? "both" : "pin",
    pinLockEnabled: true,
    pinCode: pin,
  });
  return true;
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else if (theme === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
}

function updateGreeting() {
  const hour = new Date().getHours();
  const greetingKey =
    hour < 12
      ? "greetingMorning"
      : hour < 18
        ? "greetingAfternoon"
        : "greetingEvening";
  const name = String(data.settings.profileName || "").trim();
  const greeting = `${locale(greetingKey)}${name ? `, ${name}` : ""}`;
  const el = document.getElementById("greetingText");
  if (el) el.textContent = greeting;
}

function bindStarterPage() {
  const form = document.getElementById("starterForm");
  const protection = document.getElementById("starterProtectionSelect");
  const pinFields = document.getElementById("starterPinFields");
  const language = document.getElementById("starterLanguageSelect");
  if (!form || !protection) return;

  const updateProtectionFields = () => {
    pinFields?.classList.toggle(
      "active",
      ["pin", "both"].includes(protection.value),
    );
  };
  protection.addEventListener("change", updateProtectionFields);
  language?.addEventListener("change", () => {
    setLocale(language.value);
    updateGreeting();
  });

  form.addEventListener("submit", async () => {
    const errorEl = document.getElementById("starterError");
    if (errorEl) errorEl.textContent = "";
    const lockMode = protection.value;
    const needsPin = ["pin", "both"].includes(lockMode);
    const needsBiometrics = ["biometrics", "both"].includes(lockMode);
    const pin = document.getElementById("starterPinInput")?.value || "";
    const confirmPin =
      document.getElementById("starterPinConfirmInput")?.value || "";
    if (needsPin && !/^\d{4}$/.test(pin)) {
      if (errorEl) errorEl.textContent = locale("invalidPin");
      return;
    }
    if (needsPin && pin !== confirmPin) {
      if (errorEl) errorEl.textContent = locale("pinMismatch");
      return;
    }

    let biometricCredentialId = "";
    if (needsBiometrics) {
      if (!window.PublicKeyCredential || !navigator.credentials?.create) {
        if (errorEl) errorEl.textContent = locale("biometricSetupFailed");
        return;
      }
      biometricCredentialId = await registerBiometric();
      if (!biometricCredentialId) {
        if (errorEl) errorEl.textContent = locale("biometricSetupFailed");
        return;
      }
    }

    try {
      await completeOnboarding({
        profileName: document.getElementById("starterNameInput")?.value,
        walletTitle: document.getElementById("starterWalletInput")?.value,
        initialAmount: document.getElementById("starterBalanceInput")?.value,
        currencySymbol: document.getElementById("starterCurrencyInput")?.value,
        locale: language?.value,
        lockMode,
        pinCode: pin,
        biometricCredentialId,
      });
      document.getElementById("starterOverlay")?.classList.remove("active");
      updateGreeting();
      updateDOMTranslations();
      updateSettingsLabels();
    } catch (error) {
      if (errorEl)
        errorEl.textContent = error.message || locale("requiredField");
    }
  });
  updateProtectionFields();
}

function showStarterPage() {
  const overlay = document.getElementById("starterOverlay");
  if (!overlay) return;
  document.getElementById("starterNameInput").value =
    data.settings.profileName || "";
  document.getElementById("starterCurrencyInput").value =
    data.settings.currencySymbol || "৳";
  document.getElementById("starterLanguageSelect").value =
    data.settings.locale || getLocale();
  overlay.classList.add("active");
}

// --- Security PIN & Biometrics Keypad ---
function checkPinLockOnBoot() {
  const overlay = document.getElementById("pinLockOverlay");
  const bioBtn = document.getElementById("pinBiometricBtn");
  const lockMode = getConfiguredLockMode();

  if (lockMode === "none") {
    overlay.classList.remove("active");
    return;
  }

  pinInputBuffer = "";
  updatePinDots();
  overlay.classList.add("active");

  if (["biometrics", "both"].includes(lockMode)) {
    if (bioBtn) bioBtn.style.display = "block";
    tryBiometricAuth();
  } else {
    if (bioBtn) bioBtn.style.display = "none";
  }
}

function lockApp() {
  const lockMode = getConfiguredLockMode();
  if (lockMode === "none") {
    alert(locale("noLockSetup"));
    return;
  }
  const overlay = document.getElementById("pinLockOverlay");
  pinInputBuffer = "";
  updatePinDots();
  overlay?.classList.add("active");
  if (["biometrics", "both"].includes(lockMode)) tryBiometricAuth();
}

async function tryBiometricAuth() {
  const overlay = document.getElementById("pinLockOverlay");
  if (!window.PublicKeyCredential) {
    alert(locale("biometricUnsupported"));
    return;
  }
  if (!data.settings.biometricCredentialId) {
    alert(locale("setupBiometricsFirst"));
    return;
  }
  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        timeout: 60000,
        userVerification: "preferred",
        allowCredentials: [
          {
            id: base64ToBytes(data.settings.biometricCredentialId),
            type: "public-key",
          },
        ],
      },
    });
    if (cred) {
      overlay.classList.remove("active");
    }
  } catch (err) {
    console.warn("Biometric auth cancelled or failed:", err);
  }
}

async function registerBiometric() {
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "jeb" },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: "local-user",
          displayName: "jeb user",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { userVerification: "preferred" },
        timeout: 60000,
        attestation: "none",
      },
    });
    return credential ? bytesToBase64(new Uint8Array(credential.rawId)) : null;
  } catch (error) {
    console.warn("Biometric registration failed:", error);
    alert(locale("biometricSetupFailed"));
    return null;
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bindPinLockKeypad() {
  const overlay = document.getElementById("pinLockOverlay");
  const keys = document.querySelectorAll(".pin-key[data-num]");

  keys.forEach((key) => {
    key.addEventListener("click", () => {
      const num = key.getAttribute("data-num");
      if (pinInputBuffer.length < 4) {
        pinInputBuffer += num;
        updatePinDots();
        if (pinInputBuffer.length === 4) {
          setTimeout(verifyPinInput, 150);
        }
      }
    });
  });

  document.getElementById("pinClearBtn")?.addEventListener("click", () => {
    pinInputBuffer = "";
    updatePinDots();
  });

  document.getElementById("pinBackspaceBtn")?.addEventListener("click", () => {
    pinInputBuffer = pinInputBuffer.slice(0, -1);
    updatePinDots();
  });

  document.getElementById("pinBiometricBtn")?.addEventListener("click", () => {
    tryBiometricAuth();
  });
}

function updatePinDots() {
  const dots = document.querySelectorAll(".pin-dot");
  dots.forEach((dot, idx) => {
    dot.classList.toggle("filled", idx < pinInputBuffer.length);
  });
}

function verifyPinInput() {
  const overlay = document.getElementById("pinLockOverlay");
  if (pinInputBuffer === data.settings.pinCode) {
    overlay.classList.remove("active");
  } else {
    alert(locale("incorrectPin"));
    pinInputBuffer = "";
    updatePinDots();
  }
}

// --- Entity Managers (Category & Persons) ---
function bindEntityManagers() {
  document
    .getElementById("openCategoryManagerBtn")
    ?.addEventListener("click", () => {
      renderCategoryManagerList();
      openSheet(document.getElementById("categoryManagerModal"));
    });

  document
    .getElementById("openPersonManagerBtn")
    ?.addEventListener("click", () => {
      renderPersonManagerList();
      openSheet(document.getElementById("personManagerModal"));
    });

  document
    .getElementById("addCategoryManagerBtn")
    ?.addEventListener("click", async () => {
      const val = prompt(locale("enterCategory"));
      if (val && val.trim()) {
        await addCategory(val.trim());
        renderCategoryManagerList();
      }
    });

  document
    .getElementById("addPersonManagerBtn")
    ?.addEventListener("click", async () => {
      const val = prompt(locale("enterPerson"));
      if (val && val.trim()) {
        await addPerson(val.trim());
        renderPersonManagerList();
      }
    });
}

function renderCategoryManagerList() {
  const container = document.getElementById("categoryManagerListContainer");
  container.innerHTML = "";

  data.catagories.forEach((cat) => {
    const row = document.createElement("div");
    row.className = "entity-row";
    row.innerHTML = `
      <span class="entity-name">${escapeHtml(cat)}</span>
      <div class="entity-actions">
        <button type="button" class="btn-edit">${locale("edit")}</button>
        <button type="button" class="btn-del">${locale("delete")}</button>
      </div>
    `;

    row.querySelector(".btn-edit").addEventListener("click", async () => {
      const newTitle = prompt(locale("renameCategory"), cat);
      if (newTitle && newTitle.trim()) {
        await updateCategory(cat, newTitle.trim());
        renderCategoryManagerList();
      }
    });

    row.querySelector(".btn-del").addEventListener("click", async () => {
      if (
        confirm(
          `${locale("deleteNamed")} ${locale("category").toLowerCase()} "${cat}"?`,
        )
      ) {
        await deleteCategory(cat);
        renderCategoryManagerList();
      }
    });

    container.appendChild(row);
  });
}

function renderPersonManagerList() {
  const container = document.getElementById("personManagerListContainer");
  container.innerHTML = "";

  data.persons.forEach((p) => {
    const row = document.createElement("div");
    row.className = "entity-row";
    row.innerHTML = `
      <span class="entity-name">${escapeHtml(p.name)}</span>
      <div class="entity-actions">
        <button type="button" class="btn-edit">${locale("edit")}</button>
        <button type="button" class="btn-del">${locale("delete")}</button>
      </div>
    `;

    row.querySelector(".btn-edit").addEventListener("click", async () => {
      const newName = prompt(locale("renameContact"), p.name);
      if (newName && newName.trim()) {
        await updatePerson(p.id, newName.trim());
        renderPersonManagerList();
      }
    });

    row.querySelector(".btn-del").addEventListener("click", async () => {
      if (
        confirm(
          `${locale("deleteNamed")} ${locale("contacts").toLowerCase()} "${p.name}"?`,
        )
      ) {
        await deletePerson(p.id);
        renderPersonManagerList();
      }
    });

    container.appendChild(row);
  });
}

// --- Transaction History Renderer ---
async function renderTransactionHistory() {
  const container = document.getElementById("transactionHistoryList");
  container.innerHTML = "";

  const activeSessionId = selectedViewSessionId || data.settings.currentSession;
  const filtered = await getTransactions({
    sessionIds: [activeSessionId],
    types: currentTxFilters.types,
    categories: currentTxFilters.categories,
    search: currentTxFilters.search,
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">${locale("noTransactionsMatch")}</div>`;
    return;
  }

  const sym = data.settings.currencySymbol || "৳";

  filtered.forEach((tx) => {
    const item = document.createElement("button");
    item.className = "th-list-item";

    const isNegative = [
      "expense",
      "loan_given",
      "borrowed_repaid_by_user",
    ].includes(tx.type);
    const amountSign = isNegative ? `-${sym}` : `+${sym}`;
    const amountClass = isNegative ? "out" : "in";
    const iconType = isNegative ? "arrow-up" : "arrow-down";

    const walletName = data.wallets[tx.source]?.title || "Cash";
    const targetName = tx.target
      ? ` → ${data.wallets[tx.target]?.title || locale("wallet")}`
      : "";
    const dateFormatted = formatDate(tx.dateTime);
    const headerTitle = tx.note || tx.catagory || tx.type;
    const subtext =
      tx.type === "income"
        ? `${dateFormatted} · ${escapeHtml(walletName)}`
        : `${dateFormatted} · ${escapeHtml(walletName)}${escapeHtml(targetName)}${tx.catagory ? " · " + escapeHtml(tx.catagory) : ""}`;

    item.innerHTML = `
      <div class="th-li-icon ${amountClass}">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${
            iconType === "arrow-up"
              ? `<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>`
              : `<path d="m19 12-7 7-7-7"/><path d="M12 5v14"/>`
          }
        </svg>
      </div>
      <div class="th-li-details-container">
        <div class="th-li-tr-details">${escapeHtml(headerTitle)}</div>
        <div class="th-li-tr-subtext">${subtext}</div>
      </div>
      <div class="th-li-amount">${amountSign}${formatNumber(tx.amount)}</div>
    `;

    item.addEventListener("click", () => {
      if (tx.loanId != null) {
        alert(locale("loanEntriesManaged"));
        return;
      }
      openTransactionActions(tx);
    });

    container.appendChild(item);
  });
}

// --- Wallets List Renderer ---
async function renderWalletsList() {
  const container = document.getElementById("walletsListContainer");
  container.innerHTML = "";

  const metrics = await getCurrentSessionCalculatedData();
  const walletList = Object.values(data.wallets);
  const sym = data.settings.currencySymbol || "৳";

  if (walletList.length === 0) {
    container.innerHTML = `<div class="empty-state">${locale("noWallets")}</div>`;
    return;
  }

  walletList.forEach((w) => {
    const bal = metrics.currentWalletBalances[w.id] ?? w.initialAmount ?? 0;
    const isDefault = Number(w.id) === Number(data.settings.defaultWalletId);

    const card = document.createElement("button");
    card.className = `w-list-item ${isDefault ? "is-default-wallet" : ""}`;
    card.innerHTML = `
      <div class="star-icon ${isDefault ? "active" : ""}">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isDefault ? "currentColor" : "none"}"
          stroke="currentColor" stroke-width="2">
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
        </svg>
      </div>
      <div class="wl-w-name">${escapeHtml(w.title)} ${isDefault ? "(Main)" : ""}</div>
      <div class="wl-w-balance">${sym}${formatNumber(bal)}</div>
    `;

    card.addEventListener("click", async () => {
      try {
        await selectMainWallet(w.id);
      } catch (error) {
        alert(error.message);
      }
    });

    container.appendChild(card);
  });
}

// --- Loans List & Timeline Sheet ---
async function renderLoansList() {
  const container = document.getElementById("loanListContainer");
  container.innerHTML = "";

  const sym = data.settings.currencySymbol || "৳";
  const filtered = await getLoans({
    type: currentLoanFilters.type,
    personId: currentLoanFilters.personId,
  });

  const currentSessionId = Number(data.settings.currentSession);
  const visibleLoans = filtered.filter(
    ({ loan, remaining }) =>
      remaining > 0 || Number(loan.sessionID) === currentSessionId,
  );

  if (visibleLoans.length === 0) {
    container.innerHTML = `<div class="empty-state">${locale("noLoans")}</div>`;
    return;
  }

  visibleLoans.forEach(({ loan, repayments, totalRepaid, remaining }) => {
    const person = data.persons.find(
      (p) => Number(p.id) === Number(loan.personId),
    );
    const personName = person ? person.name : locale("person");

    const progressPercent = Math.min(
      100,
      Math.round((totalRepaid / (loan.amount || 1)) * 100),
    );

    const item = document.createElement("button");
    item.className = "loan-item";
    item.innerHTML = `
      <div class="loan-progress-bar">
        <div class="loan-progress" style="width: ${progressPercent}%;"></div>
      </div>
      <div class="loan-item-body">
        <div class="loan-type-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5" />
            <path d="m16 19 3 3 3-3" />
            <path d="M19 16v6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </div>
        <div class="loan-body-text-container">
          <div class="loan-person-name">${escapeHtml(personName)}</div>
          <div class="loan-details">${escapeHtml(loan.note || (loan.type === "given" ? locale("lentMoney") : locale("borrowedMoney")))}</div>
        </div>
        <div class="loan-body-amount">
          <div class="loan-remained">${sym}${formatNumber(remaining)}</div>
          <div class="loan-total">${locale("of")} ${sym}${formatNumber(loan.amount)}</div>
        </div>
      </div>
    `;

    item.addEventListener("click", () => {
      openLoanDetailsModal(
        loan,
        personName,
        remaining,
        totalRepaid,
        repayments,
      );
    });

    container.appendChild(item);
  });
}

function openLoanDetailsModal(
  loan,
  personName,
  remaining,
  totalRepaid,
  repayments,
) {
  const sym = data.settings.currencySymbol || "৳";
  const loanEditable = canEditTransaction({ sessionID: loan.sessionID });
  closeLoanActionsMenu();
  document.getElementById("loanDetailsHeaderPerson").textContent =
    `${personName}'s ${locale("loanTimeline")}`;

  const summaryCard = document.getElementById("loanDetailsSummaryCard");
  const progressPercent = Math.min(
    100,
    Math.round((totalRepaid / (loan.amount || 1)) * 100),
  );

  summaryCard.innerHTML = `
    <div class="ld-card-header">
      <div class="ld-card-type">${loan.type === "given" ? locale("iLent") : locale("iBorrowed")}</div>
      <div class="ld-card-amount">${locale("principal")}: ${sym}${formatNumber(loan.amount)}</div>
    </div>
    <div class="ld-progress-cont">
      <div class="ld-progress-bar" style="width: ${progressPercent}%;"></div>
    </div>
    <div class="ld-card-footer">
      <span>${locale("repaid")}: ${sym}${formatNumber(totalRepaid)}</span>
      <span class="ld-rem-text">${locale("remaining")}: ${sym}${formatNumber(remaining)}</span>
    </div>
  `;

  const timelineContainer = document.getElementById("loanTimelineList");
  timelineContainer.innerHTML = "";

  if (repayments.length === 0) {
    timelineContainer.innerHTML = `<div class="empty-sub">${locale("noRepayments")}</div>`;
  } else {
    repayments.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    repayments.forEach((tx) => {
      const wallName = data.wallets[tx.source]?.title || "Cash";
      const row = document.createElement("div");
      row.className = "timeline-item-row";
      row.innerHTML = `
        <div class="timeline-item-body"><div class="tl-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg></div>
        <div class="tl-info">
          <div class="tl-date">${formatDate(tx.dateTime)}</div>
          <div class="tl-note">${escapeHtml(tx.note || wallName)} · ${escapeHtml(wallName)}</div>
        </div>
        <div class="tl-amt">${loan.type === "borrowed" ? "-" : "+"}${sym}${formatNumber(tx.amount)}</div></div>
        <div class="timeline-actions">
          <button type="button" class="timeline-action timeline-edit" data-i18n="editRepayment">${locale("editRepayment")}</button>
          <button type="button" class="timeline-action timeline-delete" data-i18n="deleteRepayment">${locale("deleteRepayment")}</button>
        </div>
      `;
      row.querySelectorAll(".timeline-action").forEach((button) => {
        button.disabled = !canEditTransaction(tx);
      });
      row
        .querySelector(".timeline-edit")
        ?.addEventListener("click", async (event) => {
          event.stopPropagation();
          openEditRepaymentModal(loan, tx, personName);
        });
      row
        .querySelector(".timeline-delete")
        ?.addEventListener("click", async (event) => {
          event.stopPropagation();
          if (!confirm(locale("deleteRepaymentConfirm"))) return;
          try {
            await deleteTransaction(tx.id);
            await refreshLoanDetails(loan.id);
          } catch (error) {
            alert(error.message);
          }
        });
      timelineContainer.appendChild(row);
    });
  }

  const editLoanButton = document.getElementById("loanDetailsEditBtn");
  const deleteLoanButton = document.getElementById("loanDetailsDeleteBtn");
  const recordRepaymentButton = document.getElementById(
    "loanDetailsRecordRepaymentBtn",
  );
  if (editLoanButton) editLoanButton.disabled = !loanEditable;
  if (deleteLoanButton) deleteLoanButton.disabled = !loanEditable;
  if (recordRepaymentButton) recordRepaymentButton.disabled = remaining <= 0;

  document.getElementById("loanDetailsEditBtn").onclick = async () => {
    if (!loanEditable) return;
    openEditLoanModal(loan);
  };

  document.getElementById("loanDetailsDeleteBtn").onclick = async () => {
    if (!loanEditable) return;
    if (!confirm(locale("deleteLoanConfirm"))) return;
    try {
      await deleteLoan(loan.id);
      closeSheet(document.getElementById("loanDetailsModal"));
    } catch (error) {
      alert(error.message);
    }
  };

  document.getElementById("loanDetailsRecordRepaymentBtn").onclick = () => {
    closeSheet(document.getElementById("loanDetailsModal"));
    openRepaymentModal(loan, personName, remaining);
  };

  openSheet(document.getElementById("loanDetailsModal"));
}

async function refreshLoanDetails(loanId) {
  const match = (await getLoans()).find(
    ({ loan }) => Number(loan.id) === Number(loanId),
  );
  if (!match) {
    closeSheet(document.getElementById("loanDetailsModal"));
    return;
  }
  const personName =
    data.persons.find(
      (person) => Number(person.id) === Number(match.loan.personId),
    )?.name || locale("person");
  openLoanDetailsModal(
    match.loan,
    personName,
    match.remaining,
    match.totalRepaid,
    match.repayments,
  );
}

function openEditLoanModal(loan) {
  closeLoanActionsMenu();
  editingLoanId = Number(loan.id);
  editingRepaymentId = null;
  formLoanState = {
    type: loan.type,
    personId: Number(loan.personId),
    walletId: Number(loan.source),
  };
  document.getElementById("loanAmountInput").value = loan.amount;
  document.getElementById("loanNoteInput").value = loan.note || "";
  setFormDateTime("loanDateTimeBtn", "loanDateTimeInput", loan.dateTime);
  document.getElementById("loanModalTitle").textContent =
    locale("editLoanTitle");
  closeSheet(document.getElementById("loanDetailsModal"));
  updateFormSelectorLabels();
  openSheet(document.getElementById("addLoanModal"));
}

function openEditRepaymentModal(loan, transaction, personName) {
  editingRepaymentId = Number(transaction.id);
  editingLoanId = null;
  formRepaymentState = {
    loanId: Number(loan.id),
    walletId: Number(transaction.source),
  };
  document.getElementById("repaymentModalTitle").textContent =
    `${locale("editRepaymentTitle")} (${personName})`;
  document.getElementById("repaymentAmountInput").value = transaction.amount;
  document.getElementById("repaymentNoteInput").value = transaction.note || "";
  setFormDateTime(
    "repaymentDateTimeBtn",
    "repaymentDateTimeInput",
    transaction.dateTime,
  );
  closeSheet(document.getElementById("loanDetailsModal"));
  updateFormSelectorLabels();
  openSheet(document.getElementById("addRepaymentModal"));
}

function openRepaymentModal(loan, personName, remaining) {
  editingRepaymentId = null;
  editingLoanId = null;
  formRepaymentState.loanId = loan.id;
  formRepaymentState.walletId = Number(
    selectedMainWalletId || data.settings.defaultWalletId || 1,
  );
  document.getElementById("repaymentModalTitle").textContent =
    `${locale("recordRepayment")} (${personName})`;
  document.getElementById("repaymentAmountInput").value = remaining;
  document.getElementById("repaymentNoteInput").value = "";
  resetDateTimeInputs();
  updateFormSelectorLabels();
  openSheet(document.getElementById("addRepaymentModal"));
}

// --- Filters & Search ---
function bindFilters() {
  const searchInp = document.getElementById("txSearchInput");
  searchInp?.addEventListener("input", (e) => {
    currentTxFilters.search = e.target.value;
    renderTransactionHistory();
  });

  const filterInBtn = document.getElementById("filterInBtn");
  const filterOutBtn = document.getElementById("filterOutBtn");
  const filterCategoryBtn = document.getElementById("filterCategoryBtn");

  filterInBtn?.addEventListener("click", () => {
    currentTxFilters.types = currentTxFilters.types.includes("income")
      ? []
      : ["income"];
    updateFilterUI();
    renderTransactionHistory();
  });

  filterOutBtn?.addEventListener("click", () => {
    currentTxFilters.types = currentTxFilters.types.includes("expense")
      ? []
      : ["expense"];
    updateFilterUI();
    renderTransactionHistory();
  });

  filterCategoryBtn?.addEventListener("click", () => {
    const options = [
      { id: null, title: locale("all") + " Categories" },
      ...data.catagories.map((c) => ({ id: c, title: c })),
    ];
    showPicker(
      locale("selectCategory"),
      options,
      currentTxFilters.categories,
      (selected, selectedIds) => {
        currentTxFilters.categories = selectedIds;
        updateFilterUI();
        renderTransactionHistory();
      },
      filterCategoryBtn,
      null,
      true,
    );
  });

  const filterLentBtn = document.getElementById("filterLentBtn");
  const filterBorrowedBtn = document.getElementById("filterBorrowedBtn");
  const filterPersonBtn = document.getElementById("filterPersonBtn");

  filterLentBtn?.addEventListener("click", () => {
    currentLoanFilters.type =
      currentLoanFilters.type === "given" ? null : "given";
    updateFilterUI();
    renderLoansList();
  });

  filterBorrowedBtn?.addEventListener("click", () => {
    currentLoanFilters.type =
      currentLoanFilters.type === "borrowed" ? null : "borrowed";
    updateFilterUI();
    renderLoansList();
  });

  filterPersonBtn?.addEventListener("click", () => {
    const options = [
      { id: null, title: locale("all") + " Persons" },
      ...data.persons.map((p) => ({ id: p.id, title: p.name })),
    ];
    showPicker(
      locale("person"),
      options,
      currentLoanFilters.personId,
      (selected) => {
        currentLoanFilters.personId = selected.id;
        updateFilterUI();
        renderLoansList();
      },
      filterPersonBtn,
    );
  });
}

function updateFilterUI() {
  document
    .getElementById("filterInBtn")
    ?.classList.toggle("active", currentTxFilters.types.includes("income"));
  document
    .getElementById("filterOutBtn")
    ?.classList.toggle("active", currentTxFilters.types.includes("expense"));

  const activeFilterChips = document.getElementById("activeFilterChips");
  if (activeFilterChips) {
    activeFilterChips.innerHTML = "";
    currentTxFilters.categories.forEach((category) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = category;
      chip.addEventListener("click", () => {
        currentTxFilters.categories = currentTxFilters.categories.filter(
          (item) => item !== category,
        );
        updateFilterUI();
        renderTransactionHistory();
      });
      activeFilterChips.appendChild(chip);
    });
  }

  document
    .getElementById("filterLentBtn")
    ?.classList.toggle("active", currentLoanFilters.type === "given");
  document
    .getElementById("filterBorrowedBtn")
    ?.classList.toggle("active", currentLoanFilters.type === "borrowed");

  const loanFilterChips = document.getElementById("loanFilterChips");
  if (loanFilterChips) {
    loanFilterChips.innerHTML = "";
    if (currentLoanFilters.personId) {
      const person = data.persons.find(
        (p) => Number(p.id) === Number(currentLoanFilters.personId),
      );
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = person ? person.name : locale("person");
      chip.addEventListener("click", () => {
        currentLoanFilters.personId = null;
        updateFilterUI();
        renderLoansList();
      });
      loanFilterChips.appendChild(chip);
    }
  }
}

// --- Form Controls & Submit Handlers ---
function bindFormControls() {
  // Add Transaction Selectors
  // Date Time Selectors Binding
  bindDateTimeSelector("txDateTimeBtn", "txDateTimeInput");
  bindDateTimeSelector("editTxDateTimeBtn", "editTxDateTimeInput");
  bindDateTimeSelector("loanDateTimeBtn", "loanDateTimeInput");
  bindDateTimeSelector("repaymentDateTimeBtn", "repaymentDateTimeInput");

  document
    .getElementById("txTypeSelectorBtn")
    ?.addEventListener("click", () => {
      const options = [
        { id: "expense", title: locale("expense") },
        { id: "income", title: locale("income") },
        { id: "transfer", title: locale("transfer") },
      ];
      showPicker(
        locale("transactionType"),
        options,
        formTxState.type,
        (selected) => {
          formTxState.type = selected.id;
          updateFormSelectorLabels();
        },
        document.getElementById("txTypeSelectorBtn"),
      );
    });

  document
    .getElementById("txCategorySelectorBtn")
    ?.addEventListener("click", () => {
      const options = data.catagories.map((c) => ({ id: c, title: c }));
      showPicker(
        locale("selectCategory"),
        options,
        formTxState.catagory,
        (selected) => {
          formTxState.catagory = selected.id;
          updateFormSelectorLabels();
        },
        document.getElementById("txCategorySelectorBtn"),
        async (customVal) => {
          await addCategory(customVal);
          formTxState.catagory = customVal.toLowerCase();
          updateFormSelectorLabels();
        },
      );
    });

  document
    .getElementById("txWalletSelectorBtn")
    ?.addEventListener("click", async () => {
      const options = await getWalletOptionsWithBalances();
      showPicker(
        locale("selectSourceWallet"),
        options,
        formTxState.walletId,
        (selected) => {
          formTxState.walletId = selected.id;
          updateFormSelectorLabels();
        },
        document.getElementById("txWalletSelectorBtn"),
      );
    });

  document
    .getElementById("txTargetWalletSelectorBtn")
    ?.addEventListener("click", async () => {
      const options = await getWalletOptionsWithBalances();
      showPicker(
        locale("selectTargetWallet"),
        options,
        formTxState.targetId,
        (selected) => {
          formTxState.targetId = selected.id;
          updateFormSelectorLabels();
        },
        document.getElementById("txTargetWalletSelectorBtn"),
      );
    });

  // Save Transaction
  document
    .getElementById("saveTransactionBtn")
    ?.addEventListener("click", async () => {
      const amountVal = Number(document.getElementById("txAmountInput").value);
      if (!amountVal || amountVal <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      if (formTxState.type === "transfer" && !formTxState.targetId) {
        alert("Please select a target wallet for transfer");
        return;
      }

      const note = document.getElementById("txNoteInput").value;
      const feeVal = Number(document.getElementById("txFeeInput")?.value) || 0;
      const dateTimeVal = document.getElementById("txDateTimeInput")?.value;
      const isoDate = dateTimeVal
        ? new Date(dateTimeVal).toISOString()
        : new Date().toISOString();

      if (["expense", "transfer"].includes(formTxState.type)) {
        const ok = await checkWalletSufficientFunds(
          formTxState.walletId,
          amountVal + (formTxState.type === "transfer" ? feeVal : 0),
        );
        if (!ok) return;
      }

      try {
        await addTransaction({
          amount: amountVal,
          dateTime: isoDate,
          catagory:
            formTxState.type === "income" ? "income" : formTxState.catagory,
          source: formTxState.walletId,
          target: formTxState.type === "transfer" ? formTxState.targetId : null,
          type: formTxState.type,
          fee: feeVal,
          note,
        });
      } catch (error) {
        alert(error.message);
        return;
      }

      lastUsedDateTimeIso = isoDate;
      document.getElementById("txAmountInput").value = "";
      document.getElementById("txNoteInput").value = "";
      if (document.getElementById("txFeeInput"))
        document.getElementById("txFeeInput").value = "";
      closeSheet(document.getElementById("addTransactionModal"));
    });

  // Edit Transaction Selectors & Submit
  document
    .getElementById("editTxTypeSelectorBtn")
    ?.addEventListener("click", () => {
      const options = [
        { id: "expense", title: locale("expense") },
        { id: "income", title: locale("income") },
        { id: "transfer", title: locale("transfer") },
      ];
      showPicker(
        locale("transactionType"),
        options,
        formEditTxState.type,
        (selected) => {
          formEditTxState.type = selected.id;
          updateEditFormSelectorLabels();
        },
        document.getElementById("editTxTypeSelectorBtn"),
      );
    });

  document
    .getElementById("editTxCategorySelectorBtn")
    ?.addEventListener("click", () => {
      const options = data.catagories.map((c) => ({ id: c, title: c }));
      showPicker(
        locale("selectCategory"),
        options,
        formEditTxState.catagory,
        (selected) => {
          formEditTxState.catagory = selected.id;
          updateEditFormSelectorLabels();
        },
        document.getElementById("editTxCategorySelectorBtn"),
      );
    });

  document
    .getElementById("editTxWalletSelectorBtn")
    ?.addEventListener("click", async () => {
      const options = await getWalletOptionsWithBalances();
      showPicker(
        locale("selectSourceWallet"),
        options,
        formEditTxState.walletId,
        (selected) => {
          formEditTxState.walletId = selected.id;
          updateEditFormSelectorLabels();
        },
        document.getElementById("editTxWalletSelectorBtn"),
      );
    });

  document
    .getElementById("editTxTargetWalletSelectorBtn")
    ?.addEventListener("click", async () => {
      const options = await getWalletOptionsWithBalances();
      showPicker(
        locale("selectTargetWallet"),
        options,
        formEditTxState.targetId,
        (selected) => {
          formEditTxState.targetId = selected.id;
          updateEditFormSelectorLabels();
        },
        document.getElementById("editTxTargetWalletSelectorBtn"),
      );
    });

  document
    .getElementById("saveEditTransactionBtn")
    ?.addEventListener("click", async () => {
      const txId = Number(document.getElementById("editTxIdInput").value);
      const amountVal = Number(
        document.getElementById("editTxAmountInput").value,
      );
      if (!txId || !amountVal || amountVal <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      const note = document.getElementById("editTxNoteInput").value;
      const feeVal =
        Number(document.getElementById("editTxFeeInput")?.value) || 0;
      const dateTimeVal = document.getElementById("editTxDateTimeInput")?.value;
      const isoDate = dateTimeVal
        ? new Date(dateTimeVal).toISOString()
        : new Date().toISOString();

      const existingTx = await db.transactions.get(txId);
      if (["expense", "transfer"].includes(formEditTxState.type)) {
        const projected = await getProjectedEditedWalletBalance(
          existingTx,
          {
            amount: amountVal,
            source: formEditTxState.walletId,
            target:
              formEditTxState.type === "transfer"
                ? formEditTxState.targetId
                : null,
            type: formEditTxState.type,
            fee: feeVal,
          },
          formEditTxState.walletId,
        );
        if (projected < 0) {
          alert(locale("insufficientFunds"));
          return;
        }
      }

      try {
        await updateTransaction(txId, {
          amount: amountVal,
          dateTime: isoDate,
          catagory:
            formEditTxState.type === "income"
              ? "income"
              : formEditTxState.catagory,
          source: formEditTxState.walletId,
          target:
            formEditTxState.type === "transfer"
              ? formEditTxState.targetId
              : null,
          type: formEditTxState.type,
          fee: feeVal,
          note,
        });
      } catch (error) {
        alert(error.message);
        return;
      }

      lastUsedDateTimeIso = isoDate;
      closeSheet(document.getElementById("editTransactionModal"));
    });

  // Save Wallet
  document
    .getElementById("saveWalletBtn")
    ?.addEventListener("click", async () => {
      const title = document.getElementById("walletTitleInput").value.trim();
      if (!title) {
        alert("Please enter a wallet name");
        return;
      }
      const initialAmount =
        Number(document.getElementById("walletInitialAmountInput").value) || 0;

      try {
        await addWallet(title, initialAmount);
      } catch (error) {
        alert(error.message);
        return;
      }

      document.getElementById("walletTitleInput").value = "";
      document.getElementById("walletInitialAmountInput").value = "";
      closeSheet(document.getElementById("addWalletModal"));
    });

  // Add Loan Selectors
  document
    .getElementById("loanTypeSelectorBtn")
    ?.addEventListener("click", () => {
      const options = [
        { id: "given", title: locale("iLent") },
        { id: "borrowed", title: locale("iBorrowed") },
      ];
      showPicker(
        locale("loanType"),
        options,
        formLoanState.type,
        (selected) => {
          formLoanState.type = selected.id;
          updateFormSelectorLabels();
        },
        document.getElementById("loanTypeSelectorBtn"),
      );
    });

  document
    .getElementById("loanPersonSelectorBtn")
    ?.addEventListener("click", () => {
      const options = data.persons.map((p) => ({ id: p.id, title: p.name }));
      showPicker(
        locale("person"),
        options,
        formLoanState.personId,
        (selected) => {
          formLoanState.personId = selected.id;
          updateFormSelectorLabels();
        },
        document.getElementById("loanPersonSelectorBtn"),
        async (customVal) => {
          const newId = await addPerson(customVal);
          formLoanState.personId = newId;
          updateFormSelectorLabels();
        },
      );
    });

  document
    .getElementById("loanWalletSelectorBtn")
    ?.addEventListener("click", async () => {
      const options = await getWalletOptionsWithBalances();
      showPicker(
        locale("selectWallet"),
        options,
        formLoanState.walletId,
        (selected) => {
          formLoanState.walletId = selected.id;
          updateFormSelectorLabels();
        },
        document.getElementById("loanWalletSelectorBtn"),
      );
    });

  // Save Loan
  document
    .getElementById("saveLoanBtn")
    ?.addEventListener("click", async () => {
      const amountVal = Number(
        document.getElementById("loanAmountInput").value,
      );
      if (!amountVal || amountVal <= 0) {
        alert("Please enter a valid amount");
        return;
      }
      if (!formLoanState.personId) {
        alert("Please select or add a person");
        return;
      }

      const note = document.getElementById("loanNoteInput").value;
      const dateTimeVal = document.getElementById("loanDateTimeInput")?.value;
      const isoDate = dateTimeVal
        ? new Date(dateTimeVal).toISOString()
        : new Date().toISOString();

      if (!editingLoanId && formLoanState.type === "given") {
        const ok = await checkWalletSufficientFunds(
          formLoanState.walletId,
          amountVal,
        );
        if (!ok) return;
      }

      try {
        if (editingLoanId) {
          await updateLoan(editingLoanId, {
            personId: formLoanState.personId,
            amount: amountVal,
            dateTime: isoDate,
            source: formLoanState.walletId,
            type: formLoanState.type,
            note,
          });
        } else {
          await addLoan({
            personId: formLoanState.personId,
            amount: amountVal,
            dateTime: isoDate,
            source: formLoanState.walletId,
            type: formLoanState.type,
            note,
          });
        }
      } catch (error) {
        alert(error.message);
        return;
      }

      lastUsedDateTimeIso = isoDate;
      document.getElementById("loanAmountInput").value = "";
      document.getElementById("loanNoteInput").value = "";
      editingLoanId = null;
      document.getElementById("loanModalTitle").textContent = locale("addLoan");
      closeSheet(document.getElementById("addLoanModal"));
    });

  document
    .getElementById("repaymentWalletSelectorBtn")
    ?.addEventListener("click", async () => {
      const options = await getWalletOptionsWithBalances();
      showPicker(
        locale("selectWallet"),
        options,
        formRepaymentState.walletId,
        (selected) => {
          formRepaymentState.walletId = selected.id;
          updateFormSelectorLabels();
        },
        document.getElementById("repaymentWalletSelectorBtn"),
      );
    });

  // Save Repayment
  document
    .getElementById("saveRepaymentBtn")
    ?.addEventListener("click", async () => {
      const amountVal = Number(
        document.getElementById("repaymentAmountInput").value,
      );
      if (!amountVal || amountVal <= 0) {
        alert("Please enter a valid amount");
        return;
      }
      if (!formRepaymentState.loanId) return;

      const note = document.getElementById("repaymentNoteInput").value;
      const dateTimeVal = document.getElementById(
        "repaymentDateTimeInput",
      )?.value;
      const isoDate = dateTimeVal
        ? new Date(dateTimeVal).toISOString()
        : new Date().toISOString();

      const loanObj = await db.loans.get(Number(formRepaymentState.loanId));
      if (!editingRepaymentId && loanObj && loanObj.type === "borrowed") {
        const ok = await checkWalletSufficientFunds(
          formRepaymentState.walletId,
          amountVal,
        );
        if (!ok) return;
      }

      try {
        if (editingRepaymentId) {
          await updateLoanRepayment(editingRepaymentId, {
            amount: amountVal,
            source: formRepaymentState.walletId,
            dateTime: isoDate,
            note,
          });
        } else {
          await addLoanRepayment({
            loanId: formRepaymentState.loanId,
            amount: amountVal,
            source: formRepaymentState.walletId,
            dateTime: isoDate,
            note,
          });
        }
      } catch (error) {
        alert(error.message);
        return;
      }

      lastUsedDateTimeIso = isoDate;
      document.getElementById("repaymentAmountInput").value = "";
      document.getElementById("repaymentNoteInput").value = "";
      editingRepaymentId = null;
      document.getElementById("repaymentModalTitle").textContent = locale(
        "recordLoanRepayment",
      );
      closeSheet(document.getElementById("addRepaymentModal"));
    });
}

let lastUsedDateTimeIso = null;

function setFormDateTime(btnId, inpId, customIso = null) {
  const btn = document.getElementById(btnId);
  const inp = document.getElementById(inpId);
  if (!btn || !inp) return;

  const targetDate = customIso ? new Date(customIso) : new Date();
  if (Number.isNaN(targetDate.getTime())) return;
  inp.value = toLocalDateTimeValue(targetDate);
  updateDateButtonLabel(btn, targetDate.toISOString());
}

function updateDateButtonLabel(btn, isoStr) {
  if (!btn || !isoStr) return;
  const d = new Date(isoStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    btn.textContent = locale("today");
  } else {
    btn.textContent = d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

function bindDateTimeSelector(btnId, inpId) {
  const btn = document.getElementById(btnId);
  const inp = document.getElementById(inpId);
  if (!btn || !inp) return;

  btn.addEventListener("click", () => {
    showPicker(
      locale("chooseDate"),
      [
        { id: "today", title: locale("today") },
        { id: "choose", title: locale("chooseDate") },
      ],
      null,
      (selected) => {
        if (selected.id === "today") {
          setFormDateTime(btnId, inpId);
        } else if (inp.showPicker) {
          try {
            inp.showPicker();
          } catch (error) {
            inp.click();
          }
        } else {
          inp.click();
        }
      },
      btn,
    );
  });

  inp.addEventListener("change", (e) => {
    if (e.target.value) {
      const selectedIso = new Date(e.target.value).toISOString();
      updateDateButtonLabel(btn, selectedIso);
    }
  });
}

function resetDateTimeInputs() {
  setFormDateTime("txDateTimeBtn", "txDateTimeInput");
  setFormDateTime("loanDateTimeBtn", "loanDateTimeInput");
  setFormDateTime("repaymentDateTimeBtn", "repaymentDateTimeInput");
}

function resetTransactionForm() {
  formTxState = {
    type: "expense",
    catagory: "other",
    walletId: Number(
      selectedMainWalletId || data.settings.defaultWalletId || 1,
    ),
    targetId: null,
  };
  document.getElementById("txAmountInput").value = "";
  document.getElementById("txNoteInput").value = "";
  document.getElementById("txFeeInput").value = "";
  updateFormSelectorLabels();
}

function resetLoanForm() {
  editingLoanId = null;
  formLoanState = {
    type: "given",
    personId: null,
    walletId: Number(
      selectedMainWalletId || data.settings.defaultWalletId || 1,
    ),
  };
  document.getElementById("loanAmountInput").value = "";
  document.getElementById("loanNoteInput").value = "";
  document.getElementById("loanModalTitle").textContent = locale("addLoan");
  updateFormSelectorLabels();
}

function resetWalletForm() {
  document.getElementById("walletTitleInput").value = "";
  document.getElementById("walletInitialAmountInput").value = "";
}

async function selectMainWallet(walletId) {
  const id = Number(walletId);
  if (!data.wallets[id]) throw new Error("Wallet not found");
  await updateSettings({ defaultWalletId: id });
  selectedMainWalletId = id;
  formTxState.walletId = id;
  formLoanState.walletId = id;
  formRepaymentState.walletId = id;
  await refreshAllViews();
}

function toLocalDateTimeValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function getWalletOptionsWithBalances() {
  const metrics = await getCurrentSessionCalculatedData();
  const sym = data.settings.currencySymbol || "৳";
  return Object.values(data.wallets).map((w) => {
    const bal = metrics.currentWalletBalances[w.id] ?? w.initialAmount ?? 0;
    return {
      id: w.id,
      title: `${w.title} (${sym}${formatNumber(bal)})`,
      rawTitle: w.title,
      balance: bal,
    };
  });
}

async function checkWalletSufficientFunds(walletId, amount) {
  const metrics = await getCurrentSessionCalculatedData();
  const currentBal = metrics.currentWalletBalances[walletId] ?? 0;
  if (currentBal < amount) {
    const sym = data.settings.currencySymbol || "৳";
    alert(
      `${locale("insufficientFunds")}\nAvailable: ${sym}${formatNumber(currentBal)} | Required: ${sym}${formatNumber(amount)}`,
    );
    return false;
  }
  return true;
}

async function getProjectedEditedWalletBalance(
  existing,
  replacement,
  walletId,
) {
  const metrics = await getCurrentSessionCalculatedData();
  let balance = Number(metrics.currentWalletBalances[walletId] ?? 0);
  balance -= walletImpact(existing, walletId);
  balance += walletImpact(replacement, walletId);
  if (existing?.feeTxId) {
    const feeTx = await db.transactions.get(Number(existing.feeTxId));
    if (feeTx && !feeTx.isDeleted) balance -= walletImpact(feeTx, walletId);
  }
  if (
    replacement.type === "transfer" &&
    Number(replacement.fee) > 0 &&
    Number(replacement.source) === Number(walletId)
  ) {
    balance -= Number(replacement.fee);
  }
  return balance;
}

function walletImpact(tx, walletId) {
  if (!tx || tx.isDeleted) return 0;
  const id = Number(walletId);
  const amount = Number(tx.amount) || 0;
  if (tx.type === "transfer") {
    return Number(tx.source) === id
      ? -amount
      : Number(tx.target) === id
        ? amount
        : 0;
  }
  if (["income", "loan_borrowed", "loan_repaid_to_user"].includes(tx.type)) {
    return Number(tx.source) === id ? amount : 0;
  }
  if (["expense", "loan_given", "borrowed_repaid_by_user"].includes(tx.type)) {
    return Number(tx.source) === id ? -amount : 0;
  }
  if (tx.type === "adjustment") {
    return Number(tx.source) === id
      ? tx.isIncrease !== false && tx.adjustmentType !== "decrease"
        ? amount
        : -amount
      : 0;
  }
  return 0;
}

async function updateFormSelectorLabels() {
  const txTypeBtn = document.getElementById("txTypeSelectorBtn");
  if (txTypeBtn) txTypeBtn.textContent = locale(formTxState.type);

  const isTransfer = formTxState.type === "transfer";
  const isIncome = formTxState.type === "income";

  document.getElementById("txTargetWalletSelectorBtn").style.display =
    isTransfer ? "inline-flex" : "none";
  document.getElementById("transferFeeRow").style.display = isTransfer
    ? "flex"
    : "none";
  document.getElementById("txCategorySelectorBtn").style.display =
    isTransfer || isIncome ? "none" : "inline-flex";

  const txCatBtn = document.getElementById("txCategorySelectorBtn");
  if (txCatBtn)
    txCatBtn.textContent = formTxState.catagory || locale("category");

  const metrics = await getCurrentSessionCalculatedData();
  const sym = data.settings.currencySymbol || "৳";

  const txWallBtn = document.getElementById("txWalletSelectorBtn");
  const walletObj = data.wallets[formTxState.walletId];
  if (txWallBtn && walletObj) {
    const bal =
      metrics.currentWalletBalances[walletObj.id] ??
      walletObj.initialAmount ??
      0;
    txWallBtn.textContent =
      `${walletObj.title} (${sym}${formatNumber(bal)})` +
      (isTransfer ? " (From)" : "");
  }

  const txTargetBtn = document.getElementById("txTargetWalletSelectorBtn");
  const targetObj = data.wallets[formTxState.targetId];
  if (txTargetBtn) {
    if (targetObj) {
      const targetBal =
        metrics.currentWalletBalances[targetObj.id] ??
        targetObj.initialAmount ??
        0;
      txTargetBtn.textContent = `${targetObj.title} (${sym}${formatNumber(targetBal)}) (To)`;
    } else {
      txTargetBtn.textContent = locale("targetWallet");
    }
  }

  const loanTypeBtn = document.getElementById("loanTypeSelectorBtn");
  if (loanTypeBtn)
    loanTypeBtn.textContent =
      formLoanState.type === "given" ? locale("iLent") : locale("iBorrowed");

  const loanPersonBtn = document.getElementById("loanPersonSelectorBtn");
  const personObj = data.persons.find(
    (p) => Number(p.id) === Number(formLoanState.personId),
  );
  if (loanPersonBtn)
    loanPersonBtn.textContent = personObj ? personObj.name : locale("person");

  const loanWallBtn = document.getElementById("loanWalletSelectorBtn");
  const lWalletObj = data.wallets[formLoanState.walletId];
  if (loanWallBtn && lWalletObj) {
    const lBal =
      metrics.currentWalletBalances[lWalletObj.id] ??
      lWalletObj.initialAmount ??
      0;
    loanWallBtn.textContent = `${lWalletObj.title} (${sym}${formatNumber(lBal)})`;
  }

  const repWallBtn = document.getElementById("repaymentWalletSelectorBtn");
  const rWalletObj = data.wallets[formRepaymentState.walletId];
  if (repWallBtn && rWalletObj) {
    const rBal =
      metrics.currentWalletBalances[rWalletObj.id] ??
      rWalletObj.initialAmount ??
      0;
    repWallBtn.textContent = `${rWalletObj.title} (${sym}${formatNumber(rBal)})`;
  }
}

async function updateEditFormSelectorLabels() {
  const typeBtn = document.getElementById("editTxTypeSelectorBtn");
  if (typeBtn) typeBtn.textContent = locale(formEditTxState.type);

  const isTransfer = formEditTxState.type === "transfer";
  const isIncome = formEditTxState.type === "income";

  const targetBtn = document.getElementById("editTxTargetWalletSelectorBtn");
  if (targetBtn) targetBtn.style.display = isTransfer ? "inline-flex" : "none";

  const feeRow = document.getElementById("editTransferFeeRow");
  if (feeRow) feeRow.style.display = isTransfer ? "flex" : "none";

  const catBtn = document.getElementById("editTxCategorySelectorBtn");
  if (catBtn) {
    catBtn.style.display = isTransfer || isIncome ? "none" : "inline-flex";
    catBtn.textContent = formEditTxState.catagory || locale("category");
  }

  const metrics = await getCurrentSessionCalculatedData();
  const sym = data.settings.currencySymbol || "৳";

  const wallBtn = document.getElementById("editTxWalletSelectorBtn");
  const walletObj = data.wallets[formEditTxState.walletId];
  if (wallBtn && walletObj) {
    const bal =
      metrics.currentWalletBalances[walletObj.id] ??
      walletObj.initialAmount ??
      0;
    wallBtn.textContent =
      `${walletObj.title} (${sym}${formatNumber(bal)})` +
      (isTransfer ? " (From)" : "");
  }

  if (targetBtn) {
    const targetObj = data.wallets[formEditTxState.targetId];
    if (targetObj) {
      const targetBal =
        metrics.currentWalletBalances[targetObj.id] ??
        targetObj.initialAmount ??
        0;
      targetBtn.textContent = `${targetObj.title} (${sym}${formatNumber(targetBal)}) (To)`;
    } else {
      targetBtn.textContent = locale("targetWallet");
    }
  }
}

export function openEditTransactionModal(tx) {
  formEditTxState = {
    id: tx.id,
    type: tx.type,
    catagory: tx.catagory || "other",
    walletId: tx.source || selectedMainWalletId || 1,
    targetId: tx.target || null,
  };
  document.getElementById("editTxIdInput").value = tx.id;
  document.getElementById("editTxAmountInput").value = tx.amount;
  document.getElementById("editTxNoteInput").value = tx.note || "";
  if (tx.dateTime) {
    setFormDateTime("editTxDateTimeBtn", "editTxDateTimeInput", tx.dateTime);
  }
  if (tx.feeTxId) {
    db.transactions.get(Number(tx.feeTxId)).then((feeTx) => {
      if (feeTx && document.getElementById("editTxFeeInput")) {
        document.getElementById("editTxFeeInput").value = feeTx.amount;
      }
    });
  }
  updateEditFormSelectorLabels();
  openSheet(document.getElementById("editTransactionModal"));
}

// --- Generic Picker Overlay Popup ---
function bindPickerOverlay() {
  const modal = document.getElementById("pickerOverlayModal");
  const closeBtn = document.getElementById("closePickerBtn");

  closeBtn?.addEventListener("click", () => {
    modal.classList.remove("active");
  });
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });
}

function showPicker(
  title,
  options,
  currentId,
  onSelect,
  targetElem,
  onAddCustom = null,
  multiple = false,
) {
  const modal = document.getElementById("pickerOverlayModal");
  document.getElementById("pickerTitle").textContent = title;
  const container = document.getElementById("pickerOptionsContainer");
  container.innerHTML = "";
  const selectedValues = Array.isArray(currentId) ? currentId.map(String) : [];
  const doneBtn = document.getElementById("pickerDoneBtn");
  if (doneBtn) {
    doneBtn.style.display = multiple ? "block" : "none";
    doneBtn.onclick = () => modal.classList.remove("active");
  }

  options.forEach((opt) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `picker-item ${multiple ? selectedValues.includes(String(opt.id)) : String(opt.id) === String(currentId) ? "selected" : ""}`;
    item.textContent = opt.title;
    item.addEventListener("click", () => {
      if (multiple) {
        let next = selectedValues.slice();
        if (opt.id == null) {
          next = [];
        } else if (next.includes(String(opt.id))) {
          next = next.filter((id) => id !== String(opt.id));
        } else {
          next.push(String(opt.id));
        }
        selectedValues.splice(0, selectedValues.length, ...next);
        item.classList.toggle(
          "selected",
          selectedValues.includes(String(opt.id)),
        );
        onSelect(opt, selectedValues.slice());
      } else {
        modal.classList.remove("active");
        onSelect(opt);
      }
    });
    container.appendChild(item);
  });

  const customRow = document.getElementById("pickerCustomInputRow");
  if (onAddCustom) {
    customRow.style.display = "flex";
    const customInp = document.getElementById("pickerCustomInput");
    customInp.value = "";

    const addBtn = document.getElementById("pickerAddCustomBtn");
    addBtn.onclick = () => {
      const val = customInp.value.trim();
      if (val) {
        modal.classList.remove("active");
        onAddCustom(val);
      }
    };
  } else {
    customRow.style.display = "none";
  }

  modal.classList.add("active");

  if (!targetElem) return;

  const picker = document.querySelector(".picker-content");
  const targetElemPosition = targetElem.getBoundingClientRect();

  let left = window.innerWidth / 2 - picker.offsetWidth / 2;
  let top = (picker.style.top =
    window.innerHeight / 2 - picker.offsetHeight / 2);

  const onRight =
    targetElemPosition.left > window.innerWidth - targetElemPosition.right;

  const hasLeftSpace = targetElemPosition.right > picker.offsetWidth;
  const hasRightSpace =
    window.innerWidth - targetElemPosition.left > picker.offsetWidth;

  const hasBottomSpace =
    window.innerHeight - targetElemPosition.bottom - 5 > picker.offsetHeight;
  const hasTopSpace = targetElemPosition.top - 5 > picker.offsetHeight;

  if (onRight) {
    left = hasLeftSpace ? targetElemPosition.right - picker.offsetWidth : left;
  } else {
    left = hasRightSpace ? targetElemPosition.left : left;
  }

  if (hasBottomSpace) {
    top = targetElemPosition.bottom + 5;
  } else if (hasTopSpace) {
    top = targetElemPosition.top - 5 - picker.offsetHeight;
  }

  picker.style.left = `${left}px`;
  picker.style.top = `${top}px`;
}
