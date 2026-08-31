import { db, data, DEFAULT_CATEGORIES } from "./database.js";
import { eventBus } from "./events.js";
import { checkAndStampSessions } from "./session-service.js";

export async function init() {
  if (!db.isOpen()) await db.open();
  if ((await db.settings.count()) === 0) await seedInitialData();
  await ensureBootstrapRecords();

  data.settings.theme = (await db.settings.get("theme"))?.value || "system";
  data.settings.locale = (await db.settings.get("locale"))?.value || "en";
  data.settings.currentSession = Number((await db.settings.get("currentSession"))?.value) || 1;
  data.settings.defaultWalletId = Number((await db.settings.get("defaultWalletId"))?.value) || 1;
  data.settings.currencySymbol = (await db.settings.get("currencySymbol"))?.value || "৳";
  data.settings.pinLockEnabled = (await db.settings.get("pinLockEnabled"))?.value === true;
  data.settings.pinCode = (await db.settings.get("pinCode"))?.value || "";
  data.settings.lockMode = (await db.settings.get("lockMode"))?.value || (data.settings.pinLockEnabled ? "pin" : "none");
  data.settings.biometricCredentialId = (await db.settings.get("biometricCredentialId"))?.value || "";
  data.settings.netWorthHidden = (await db.settings.get("netWorthHidden"))?.value === true;
  data.settings.profileName = (await db.settings.get("profileName"))?.value || "";
  const onboardingSetting = await db.settings.get("onboardingCompleted");
  if (onboardingSetting == null) {
    const [walletCount, transactionCount, personCount] = await Promise.all([
      db.wallets.count(),
      db.transactions.count(),
      db.persons.count(),
    ]);
    data.settings.onboardingCompleted = walletCount > 1 || transactionCount > 0 || personCount > 0 || Boolean(data.settings.pinCode);
    await db.settings.put({ key: "onboardingCompleted", value: data.settings.onboardingCompleted });
  } else {
    data.settings.onboardingCompleted = onboardingSetting.value === true;
  }

  data.sessions = {};
  await db.sessions.each((session) => { data.sessions[session.id] = session; });
  data.wallets = {};
  await db.wallets.each((wallet) => { data.wallets[wallet.id] = wallet; });

  if (!data.wallets[data.settings.defaultWalletId]) {
    const firstWallet = Object.values(data.wallets)[0];
    if (firstWallet) {
      data.settings.defaultWalletId = firstWallet.id;
      await db.settings.put({ key: "defaultWalletId", value: firstWallet.id });
    }
  }

  data.catagories = (await db.catagories.toArray()).map((category) => category.title);
  data.persons = await db.persons.toArray();
  await checkAndStampSessions();
  eventBus.emit("store:initialized", data);
}

async function seedInitialData() {
  await db.settings.bulkPut([
    { key: "theme", value: "system" },
    { key: "locale", value: "en" },
    { key: "currentSession", value: 1 },
    { key: "defaultWalletId", value: 1 },
    { key: "currencySymbol", value: "৳" },
    { key: "pinLockEnabled", value: false },
    { key: "pinCode", value: "" },
    { key: "lockMode", value: "none" },
    { key: "biometricCredentialId", value: "" },
    { key: "netWorthHidden", value: false },
    { key: "profileName", value: "" },
    { key: "onboardingCompleted", value: false },
  ]);
  await db.catagories.bulkPut(DEFAULT_CATEGORIES.map((title) => ({ title })));
  await db.wallets.put({ id: 1, title: "Cash", initialAmount: 0 });
  await db.sessions.put({ id: 1, title: "Session #1", isClosed: false, isStamped: false, startDate: new Date().toISOString() });
}

async function ensureBootstrapRecords() {
  if ((await db.wallets.count()) === 0) await db.wallets.put({ id: 1, title: "Cash", initialAmount: 0 });
  if ((await db.sessions.count()) === 0) await db.sessions.put({ id: 1, title: "Session #1", isClosed: false, isStamped: false, startDate: new Date().toISOString() });

  const configuredSessionId = Number((await db.settings.get("currentSession"))?.value) || 1;
  if (!(await db.sessions.get(configuredSessionId))) {
    await db.sessions.put({ id: configuredSessionId, title: `Session #${configuredSessionId}`, isClosed: false, isStamped: false, startDate: new Date().toISOString() });
  }
  if ((await db.settings.get("currentSession")) == null) await db.settings.put({ key: "currentSession", value: 1 });
  if ((await db.settings.get("defaultWalletId")) == null) await db.settings.put({ key: "defaultWalletId", value: 1 });
  if ((await db.catagories.count()) === 0) await db.catagories.bulkPut(DEFAULT_CATEGORIES.map((title) => ({ title })));
}
