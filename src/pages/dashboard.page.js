// src/pages/dashboard.page.js
import { formatYmd } from "../core/time.js";

export function renderDashboardPage({ root, data, dashboardApi, rerenderHook }) {
  function esc(s) {
    return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  }

  function progressBar(ratio) {
    const pct = Math.max(0, Math.min(1, ratio)) * 100;
    return `
      <div class="progress">
        <div class="progress__bar" style="width:${pct}%;"></div>
      </div>
    `;
  }

  function render() {
    const snap = dashboardApi.computeSnapshot(new Date());
    const today = formatYmd(new Date());

    const { statusCount, wipLimitActive } = snap;
    const wipWarn = (statusCount.active > wipLimitActive)
      ? `⚠ Active ${statusCount.active}/${wipLimitActive}：建議先完成或暫停其中一項`
      : "";

    root.innerHTML = `
      <section class="card">
        <h1>Dashboard</h1>
        <div class="row row--between">
          <div class="muted">Today: ${today}</div>
          <div class="muted">Local Saved ✅</div>
        </div>
        ${wipWarn ? `<div class="notice">${esc(wipWarn)}</div>` : ""}
      </section>

      <section class="grid grid--2">
        ${kpiCard("This Week", snap.week)}
        ${kpiCard("This Month", snap.month)}
      </section>

      <section class="card">
        <h2>Status Overview</h2>
        <div class="chips">
          <span class="chip chip--active">🟢 Active ${statusCount.active}/${wipLimitActive}</span>
          <span class="chip chip--waiting">🟡 Waiting ${statusCount.waiting}</span>
          <span class="chip chip--paused">🔵 Paused ${statusCount.paused}</span>
          <span class="chip chip--done">⚫ Done ${statusCount.done}</span>
        </div>
      </section>

      <section class="grid grid--2">
        <section class="card">
          <h2>This Week – Completed (${snap.week.completedList.length})</h2>
          ${completedListHtml(snap.week.completedList)}
        </section>

        <section class="card">
          <h2>This Month – Completed (${snap.month.completedList.length})</h2>
          ${completedListHtml(snap.month.completedList)}
        </section>
      </section>
    `;

    function kpiCard(title, block) {
      return `
        <section class="card">
          <h2>${title}</h2>
          <div class="kpi">
            <div class="kpi__label">Completion</div>
            <div class="kpi__value">${esc(block.completionText)}</div>
          </div>
          ${progressBar(block.completionRatio)}
          <div class="kpiRow">
            <div>Started: <b>${block.startedN}</b></div>
            <div>Completed: <b>${block.completedN}</b></div>
          </div>
        </section>
      `;
    }

    function completedListHtml(list) {
      if (!list.length) return `<div class="muted">（無）</div>`;
      return `
        <div class="list">
          ${list.map(it => `
            <div class="item item--compact">
              <div class="title">✔ ${esc(it.title)}</div>
              <div class="meta muted">${it.doneAt ? esc(it.doneAt.slice(0, 10)) : ""}</div>
            </div>
          `).join("")}
        </div>
      `;
    }
  }

  // 讓外部插件（dashboard.plugin）可觸發更新
  rerenderHook.current = render;

  render();
}
