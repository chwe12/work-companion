// src/plugins/recurring.plugin.js
import { emit } from "../core/bus.js";
import { formatYmd } from "../core/time.js";

export function registerRecurringPlugin({ data }) {
  function todayYmd() {
    return formatYmd(new Date());
  }

  function parseYmd(ymd) {
    // ymd: YYYY-MM-DD
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  function addDaysYmd(ymd, days) {
    const dt = parseYmd(ymd);
    dt.setDate(dt.getDate() + days);
    return formatYmd(dt);
  }

  function diffDays(aYmd, bYmd) {
    // b - a (days)
    const a = parseYmd(aYmd).getTime();
    const b = parseYmd(bYmd).getTime();
    return Math.round((b - a) / (24 * 3600 * 1000));
  }

  function ensureRecurringShape(r) {
    // 兼容舊資料
    if (!r.anchorDueDate) r.anchorDueDate = r.nextDueDate;
    if (!r.periodDays) r.periodDays = 14;
    return r;
  }

  function createRecurring({ name, periodDays, anchorDueDate }) {
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const nextDueDate = anchorDueDate; // 初始 next = anchor

    const item = ensureRecurringShape({
      id,
      name,
      periodDays,
      anchorDueDate,
      nextDueDate,
      lastDoneAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    data.recurring.push(item);
    emit({ type: "recurring_add", recurringId: id, at: nowIso });
    return id;
  }

  function computeNextDueDateFixedAnchor(r, fromYmd) {
    // 固定 anchor：next = anchor + ceil((from-anchor+1)/period)*period
    const anchor = r.anchorDueDate;
    const p = r.periodDays;

    const delta = diffDays(anchor, fromYmd); // from - anchor
    // 若 from <= anchor：next 就是 anchor
    if (delta < 0) return anchor;

    // 已經到 anchor 之後：找下一個 strictly after from
    // k = floor(delta/p) + 1
    const k = Math.floor(delta / p) + 1;
    return addDaysYmd(anchor, k * p);
  }

  function markDone(recurringId) {
    const r = data.recurring.find(x => x.id === recurringId);
    if (!r) return;
    ensureRecurringShape(r);

    const nowIso = new Date().toISOString();
    const today = todayYmd();

    r.lastDoneAt = nowIso;

    // 依「固定 anchor」推下一次（不漂移）
    r.nextDueDate = computeNextDueDateFixedAnchor(r, today);
    r.updatedAt = nowIso;

    emit({ type: "recurring_done", recurringId, at: nowIso, nextDueDate: r.nextDueDate });
  }

  function removeRecurring(recurringId) {
    const idx = data.recurring.findIndex(x => x.id === recurringId);
    if (idx < 0) return;
    data.recurring.splice(idx, 1);
    emit({ type: "recurring_remove", recurringId, at: new Date().toISOString() });
  }

  function listWithStatus() {
    const today = todayYmd();
    const upcomingDays = data.settings?.upcomingDays ?? 3;

    return data.recurring.map(raw => {
      const r = ensureRecurringShape(raw);
      const daysLeft = diffDays(today, r.nextDueDate); // nextDue - today
      let badge = "";
      if (daysLeft < 0) badge = `逾期 ${Math.abs(daysLeft)} 天`;
      else if (daysLeft === 0) badge = "今天到期";
      else if (daysLeft <= upcomingDays) badge = `即將到期（${daysLeft} 天）`;

      return { ...r, daysLeft, badge };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }

  return {
    createRecurring,
    markDone,
    removeRecurring,
    listWithStatus,
  };
}
