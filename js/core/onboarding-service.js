import { db, data } from "./database.js";
import { eventBus } from "./events.js";

const VALID_LOCK_MODES = new Set(["pin", "biometrics", "both"]);

export async function completeOnboarding({
  profileName = "",
  walletTitle = "Cash",
  initialAmount = 0,
  currencySymbol = "৳",
  locale = "en",
  lockMode = "pin",
  pinCode = "",
  biometricCredentialId = "",
} = {}) {
  const cleanName = String(profileName || "").trim();
  const cleanWalletTitle = String(walletTitle || "").trim();
  const amount = Number(initialAmount || 0);
  if (!cleanWalletTitle) throw new Error("Main wallet name is required");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Opening balance must be zero or greater");
  if (!/[a-z]{2}/i.test(String(locale))) throw new Error("Choose a valid language");
  if (!VALID_LOCK_MODES.has(lockMode)) throw new Error("Choose PIN or biometric protection");
  const needsPin = ["pin", "both"].includes(lockMode);
  const needsBiometrics = ["biometrics", "both"].includes(lockMode);
  if (needsPin && !/^\d{4}$/.test(String(pinCode))) throw new Error("PIN must contain exactly 4 digits");
  if (needsBiometrics && !biometricCredentialId) throw new Error("Biometric setup is required");

  const wallet = (await db.wallets.toArray()).sort((a, b) => Number(a.id) - Number(b.id))[0];
  if (!wallet) throw new Error("Main wallet could not be created");

  const settings = {
    profileName: cleanName,
    currencySymbol: String(currencySymbol || "৳").trim() || "৳",
    locale: String(locale).toLowerCase() === "bn" ? "bn" : "en",
    defaultWalletId: wallet.id,
    lockMode,
    pinLockEnabled: needsPin,
    pinCode: needsPin ? String(pinCode) : "",
    biometricCredentialId: needsBiometrics ? biometricCredentialId : "",
    onboardingCompleted: true,
  };

  await db.transaction("rw", [db.wallets, db.settings], async () => {
    await db.wallets.update(wallet.id, { title: cleanWalletTitle, initialAmount: amount });
    for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  });

  data.wallets[wallet.id] = { ...data.wallets[wallet.id], title: cleanWalletTitle, initialAmount: amount };
  Object.assign(data.settings, settings);
  eventBus.emit("onboarding:completed", settings);
  return settings;
}
