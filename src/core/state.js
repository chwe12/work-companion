// src/core/state.js
import { emit } from "./bus.js";

export function createState(dataRef) {
  const data = dataRef; // 直接引用 app.js 裡的 data

  function addItem(title) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const item = {
      id,
      title,
      status: "active",
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      doneAt: null,
      dueAt: null, // 新增：YYYY-MM-DD or null
    };
    data.items.unshift(item);

    data.events.push({ id: crypto.randomUUID(), type: "item_add", itemId: id, at: now });
    emit({ type: "item_add", itemId: id, at: now });
    return id;
  }

  function changeStatus(itemId, toStatus) {
    const item = data.items.find(x => x.id === itemId);
    if (!item) return;

    const fromStatus = item.status;
    if (fromStatus === toStatus) return;

    const now = new Date().toISOString();
    item.status = toStatus;
    item.updatedAt = now;
    if (toStatus === "active" && !item.startedAt) item.startedAt = now;
    if (toStatus === "done") item.doneAt = now;

    const evt = { id: crypto.randomUUID(), type: "status_change", itemId, fromStatus, toStatus, at: now };
    data.events.push(evt);
    emit(evt);
  }

  function setDueAt(itemId, dueYmdOrNull) {
    const item = data.items.find(x => x.id === itemId);
    if (!item) return;

    const now = new Date().toISOString();
    item.dueAt = dueYmdOrNull || null; // 期望 YYYY-MM-DD 或 null
    item.updatedAt = now;

    const evt = { id: crypto.randomUUID(), type: "item_edit", itemId, at: now };
    data.events.push(evt);
    emit({ type: "item_edit", itemId, at: now });
  }

  function setTitle(itemId, newTitle) {
  const item = data.items.find(x => x.id === itemId);
  if (!item) return;

  const title = String(newTitle || "").trim();
  if (!title) return;

  const now = new Date().toISOString();
  item.title = title;
  item.updatedAt = now;

  const evt = { id: crypto.randomUUID(), type: "item_edit", itemId, at: now };
  data.events.push(evt);
  emit({ type: "item_edit", itemId, at: now });
}


  function getActiveCount() {
    return data.items.filter(x => x.status === "active").length;
  }

  return { addItem, changeStatus, setDueAt, setTitle, getActiveCount };

}
