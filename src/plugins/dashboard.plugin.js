// src/plugins/dashboard.plugin.js
import { on } from "../core/bus.js";
import { startOfWeekMonday, endOfWeekSunday, startOfMonth, endOfMonth, inRange } from "../core/time.js";

// 這個插件做兩件事：
// 1) 提供 computeSnapshot(now) 給 dashboard.page.js 畫面渲染用
// 2) 監聽事件，讓 dashboard 開著時會即時更新（可選，但你會想要）
// [根據你提供的需求] + [此為通用領域知識，非來源直接陳述]

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

    // Completed 清單：你要求「全部列出」
    // 這裡照 doneAt 排序，最新在上
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
        // 你指定 Started=0 顯示 0/0 且 0%
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
