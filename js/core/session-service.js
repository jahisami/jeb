import { db, data, assertSessionWritable } from "./database.js";
import { eventBus } from "./events.js";
import { shouldStampSession } from "./calculator.js";
import { getSessionSummary } from "./finance-service.js";
import { updateSettings } from "./entity-service.js";

export async function createNewSession(title = "") {
  const currentSessionId = data.settings.currentSession;
  const currentSession = await db.sessions.get(currentSessionId);
  const now = new Date().toISOString();
  if (currentSession) {
    await db.sessions.update(currentSessionId, { isClosed: true, endDate: now });
    if (data.sessions[currentSessionId]) Object.assign(data.sessions[currentSessionId], { isClosed: true, endDate: now });
  }
  const nextSessionId = currentSessionId + 1;
  const newSession = { id: nextSessionId, title: String(title || "").trim() || `Session #${nextSessionId}`, isClosed: false, isStamped: false, startDate: now };
  await db.sessions.put(newSession);
  data.sessions[nextSessionId] = newSession;
  await updateSettings({ currentSession: nextSessionId });
  await checkAndStampSessions();
  eventBus.emit("session:created", newSession);
  return nextSessionId;
}

export async function renameSession(sessionId, title) {
  const id = Number(sessionId);
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) throw new Error("Session title is required");
  if (!(await db.sessions.get(id))) throw new Error("Session not found");
  await db.sessions.update(id, { title: cleanTitle });
  if (data.sessions[id]) data.sessions[id].title = cleanTitle;
  eventBus.emit("session:renamed", { id, title: cleanTitle });
}

export async function stampSession(sessionId) {
  const id = Number(sessionId);
  const session = await db.sessions.get(id);
  if (!session) throw new Error("Session not found");
  if (!session.isClosed) throw new Error("Only closed sessions can be stamped");
  if (session.isStamped && session.stampedSummary) return session.stampedSummary;
  const summary = await getSessionSummary([id]);
  await db.sessions.update(id, { isStamped: true, stampedSummary: summary });
  if (data.sessions[id]) Object.assign(data.sessions[id], { isStamped: true, stampedSummary: summary });
  eventBus.emit("session:stamped", { id, summary });
  return summary;
}

export async function checkAndStampSessions() {
  const sessions = (await db.sessions.toArray()).sort((a, b) => a.id - b.id);
  for (let index = 0; index < sessions.length - 1; index += 1) {
    const session = sessions[index];
    if (!shouldStampSession(session, sessions[index + 1])) continue;
    const summary = await getSessionSummary([session.id]);
    await db.sessions.update(session.id, { isStamped: true, stampedSummary: summary });
    session.isStamped = true;
    session.stampedSummary = summary;
    data.sessions[session.id] = session;
  }
}

export { assertSessionWritable };
