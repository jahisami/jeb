import { db, data } from "./database.js";
import { eventBus } from "./events.js";

export async function addPerson(name) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("Person name is required");
  const existing = await db.persons.where("name").equalsIgnoreCase(clean).first();
  if (existing) return existing.id;
  const id = await db.persons.add({ name: clean });
  data.persons.push({ id, name: clean });
  eventBus.emit("person:added", { id, name: clean });
  return id;
}

export async function updatePerson(id, name) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("Person name is required");
  await db.persons.update(Number(id), { name: clean });
  const person = data.persons.find((item) => Number(item.id) === Number(id));
  if (person) person.name = clean;
  eventBus.emit("person:updated", { id: Number(id), name: clean });
}

export async function deletePerson(id) {
  const linkedLoan = await db.loans.where("personId").equals(Number(id)).filter((loan) => !loan.isDeleted).first();
  if (linkedLoan) throw new Error("This person is linked to an active loan");
  await db.persons.delete(Number(id));
  data.persons = data.persons.filter((person) => Number(person.id) !== Number(id));
  eventBus.emit("person:deleted", Number(id));
}

export async function addCategory(title) {
  const clean = String(title || "").trim().toLowerCase();
  if (!clean) throw new Error("Category name is required");
  if (data.catagories.includes(clean)) return clean;
  await db.catagories.put({ title: clean });
  data.catagories.push(clean);
  eventBus.emit("category:added", clean);
  return clean;
}

export async function updateCategory(oldTitle, newTitle) {
  const oldValue = String(oldTitle || "").trim().toLowerCase();
  const newValue = String(newTitle || "").trim().toLowerCase();
  if (!newValue) throw new Error("Category name is required");
  if (oldValue !== newValue && data.catagories.includes(newValue)) throw new Error("That category already exists");
  await db.transaction("rw", [db.catagories, db.transactions], async () => {
    await db.catagories.delete(oldValue);
    await db.catagories.put({ title: newValue });
    const transactions = await db.transactions.where("catagory").equals(oldValue).toArray();
    for (const transaction of transactions) await db.transactions.update(transaction.id, { catagory: newValue });
  });
  const index = data.catagories.indexOf(oldValue);
  if (index !== -1) data.catagories[index] = newValue;
  eventBus.emit("category:updated", { oldTitle: oldValue, newTitle: newValue });
}

export async function deleteCategory(title) {
  const clean = String(title || "").trim().toLowerCase();
  await db.catagories.delete(clean);
  data.catagories = data.catagories.filter((category) => category !== clean);
  eventBus.emit("category:deleted", clean);
}

export async function addWallet(title, initialAmount = 0) {
  const cleanTitle = String(title || "").trim();
  const amount = Number(initialAmount);
  if (!cleanTitle) throw new Error("Wallet name is required");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Initial wallet balance must be zero or greater");
  const wallet = { title: cleanTitle, initialAmount: amount };
  const id = await db.wallets.add(wallet);
  data.wallets[id] = { id, ...wallet };
  eventBus.emit("wallet:added", data.wallets[id]);
  return id;
}

export async function updateSettings(newSettings) {
  await db.transaction("rw", db.settings, async () => {
    for (const [key, value] of Object.entries(newSettings)) await db.settings.put({ key, value });
  });
  Object.assign(data.settings, newSettings);
  eventBus.emit("settings:updated", data.settings);
}
