// src/plugins/recurring.plugin.js
import { emit } from "../core/bus.js";
import { formatYmd } from "../core/time.js";

export function registerRecurringPlugin({ data }) {
  // ---- ensure data shapes ----
  if (!data.recurring) data.recurring = [];
  if (!data.events) data.events = [];

  // ---- date helpers (all in local time, ymd only) ----
  function todayYmd() {
    return formatYmd(new Date());
  }

  function parseYmd(ymd) {
    const [y, m, d] = String(ymd).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  }

  function addDaysYmd(ymd, days) {
    const dt = parseYmd(ymd);
    dt.setDate(dt.getDate() + Number(days || 0));
    return formatYmd(dt);
  }

  function diffDays(aYmd, bYmd) {
    // a - b in days
    const a = parseYmd(aYmd).getTime();
    const b = parseYmd(bYmd).getTime();
    return Math.floor((a - b) / 86400000);
  }

  function clampPeriodDays(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.floor(n);
  }

  // ---- core rule: fixed anchor cycle ----
  // Return the next occurrence date (YYYY-MM-DD) that is >= baseYmd
  // aligned to anchorDueDate + k*periodDays.
  function computeNextDueDateFixedAnchor(anchorDueDate, periodDays, baseYmd) {
    const anchor = parseYmd(anchorDueDate);
    const base = parseYmd(baseYmd);

    const period = clampPeriodDays(periodDays);

    // if anchor is already >= base, next is anchor
    if (anchor.getTime() >= base.getTime()) return formatYmd(anchor);

    const diff = Math.floor((base.getTime() - anchor.getTime()) / 86400000);
    const k = Math.floor(diff / period) + 1;

    const next = new Date(anchor);
    next.setDate(anchor.getDate() + k * period);
    return formatYmd(next);
  }

  // ---- API ----
  function createRecurring({ name, periodDays, anchorDueDate }) {
    const nm = String(name || "").trim();
    const anchor = String(anchorDueDate || "").trim();
    const period = clampPeriodDays(periodDays);

    if (!nm) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return;

    const nowIso = new Date().toISOString();
    const t = todayYmd();

    const r = {
      id: crypto.randomUUID(),
      name: nm,
      periodDays: period,
      anchorDueDate: anchor,
      nextDueDate: computeNextDueDateFixedAnchor(anchor, period, t),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    data.recurring.push(r);

    data.events.push({
      id: crypto.randomUUID(),
      type: "recurring_create",
      recurringId: r.id,
      at: nowIso,
    });

    emit({ type: "recurring_create", recurringId: r.id, at: nowIso });
  }

  function updateRecurring(id, patch) {
    const r = data.recurring.find((x) => x.id === id);
    if (!r) return;

    // patch: { name?, periodDays?, anchorDueDate? }
    if (patch && typeof patch.name === "string") {
      const nm = patch.name.trim();
      if (nm) r.name = nm;
    }

    if (patch && patch.periodDays != null) {
      r.periodDays = clampPeriodDays(patch.periodDays);
    }

    if (patch && typeof patch.anchorDueDate === "string") {
      const anchor = patch.anchorDueDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(anchor)) r.anchorDueDate = anchor;
    }

    // recompute next due from today
    const t = todayYmd();
    r.nextDueDate = computeNextDueDateFixedAnchor(r.anchorDueDate, r.periodDays, t);

    const nowIso = new Date().toISOString();
    r.updatedAt = nowIso;

    data.events.push({
      id: crypto.randomUUID(),
      type: "recurring_edit",
      recurringId: r.id,
      at: nowIso,
    });

    emit({ type: "recurring_edit", recurringId: r.id, at: nowIso });
  }

  function markDone(id) {
    const r = data.recurring.find((x) => x.id === id);
    if (!r) return;

    const t = todayYmd();
    const nowIso = new Date().toISOString();

    // If user marks done early (nextDueDate is in the future),
    // advance from that scheduled date by one period.
    // Otherwise, advance to the next cycle after today.
    const nd = r.nextDueDate || computeNextDueDateFixedAnchor(r.anchorDueDate, r.periodDays, t);
    const daysToNext = diffDays(nd, t); // nd - today

    if (daysToNext > 0) {
      // early done: push one full period from current nextDueDate
      r.nextDueDate = addDaysYmd(nd, r.periodDays);
    } else {
      // due today or overdue: compute next >= tomorrow
      const tomorrow = addDaysYmd(t, 1);
      r.nextDueDate = computeNextDueDateFixedAnchor(r.anchorDueDate, r.periodDays, tomorrow);
    }

    r.updatedAt = nowIso;

    data.events.push({
      id: crypto.randomUUID(),
      type: "recurring_done",
      recurringId: r.id,
      at: nowIso,
    });

    emit({ type: "recurring_done", recurringId: r.id, at: nowIso });
  }

  function removeRecurring(id) {
    const idx = data.recurring.findIndex((x) => x.id === id);
    if (idx < 0) return;

    const nowIso = new Date().toISOString();
    data.recurring.splice(idx, 1);

    data.events.push({
      id: crypto.randomUUID(),
      type: "recurring_remove",
      recurringId: id,
      at: nowIso,
    });

    emit({ type: "recurring_remove", recurringId: id, at: nowIso });
  }

  function listWithStatus({ upcomingDays = 3 } = {}) {
    const t = todayYmd();

    return (data.recurring || [])
      .map((r) => {
        const next = r.nextDueDate || computeNextDueDateFixedAnchor(r.anchorDueDate, r.periodDays, t);
        const daysLeft = diffDays(next, t);

        let badge = "";
        if (daysLeft < 0) badge = `已逾期（${Math.abs(daysLeft)} 天）`;
        else if (daysLeft === 0) badge = "今天到期";
        else if (daysLeft <= upcomingDays) badge = `即將到期（${daysLeft} 天）`;

        return { ...r, nextDueDate: next, daysLeft, badge };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  return {
    createRecurring,
    updateRecurring,
    markDone,
    removeRecurring,
    listWithStatus,
  };
}
