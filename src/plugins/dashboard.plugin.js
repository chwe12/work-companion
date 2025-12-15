// src/plugins/dashboard.plugin.js
import { on } from "../core/bus.js";
import { startOfWeekMonday, endOfWeekSunday, startOfMonth, endOfMonth, inRange } from "../core/time.js";

export function registerDashboardPlugin({ data, notifyDashboard }) {
  function computeSnapshot(now = new Date()) {
    const wStart = startOfWeekMonday(now);
    const wEnd = endOfWeekSunday(now);
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    const items = data.items;

    const weekStarted = items.filter(it => it.startedAt && inRange(it.startedAt, wStart, wEnd));
    const weekCompleted = items.filter(it => it.doneAt && inRange(it.doneAt, wStart, wEnd));

    const monthStarted = items.filter(it => it.startedAt && inRange(it.startedAt, mStart, mEnd));
    const monthCompleted = items.filter(it => it.doneAt && inRange(it.doneAt, mStart, mEnd));

    const statusCount = {
      active: items.filter(x => x.status === "active").length,
      waiting: items.filter(x => x.status === "waiting").length,
      paused: items.filter(x => x.status === "paused").length,
      done: items.filter(x => x.status === "done").length,
    };

    const weekCompletedList = weekCompleted
      .slice()
      .sort((a, b) => new Date(b.doneAt).getTime() - new Date(a.doneAt).getTime());

    const monthCompletedList = monthCompleted
      .slice()
      .sort((a, b) => new Date(b.doneAt).getTime() - new Date(a.doneAt).getTime());

    const wStartedN = weekStarted.length;
    const wCompletedN = weekCompleted.length;

    const mStartedN = monthStarted.length;
    const mCompletedN = monthCompleted.length;

    return {
      ranges: { wStart, wEnd, mStart, mEnd },
      week: {
        startedN: wStartedN,
        completedN: wCompletedN,
        completionText: `${wCompletedN}/${wStartedN}`,
        completionRatio: (wStartedN === 0) ? 0 : (wCompletedN / wStartedN),
        completedList: weekCompletedList,
      },
      month: {
        startedN: mStartedN,
        completedN: mCompletedN,
        completionText: `${mCompletedN}/${mStartedN}`,
        completionRatio: (mStartedN === 0) ? 0 : (mCompletedN / mStartedN),
        completedList: monthCompletedList,
      },
      statusCount,
      wipLimitActive: data.settings?.wipLimitActive ?? 7,
    };
  }

  // 讓 dashboard 開著時能更新
  const triggers = ["status_change", "item_add", "item_edit", "import_done", "reset_done"];
  for (const t of triggers) {
    on(t, () => notifyDashboard?.());
  }

  return { computeSnapshot };
}
