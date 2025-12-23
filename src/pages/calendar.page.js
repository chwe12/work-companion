// src/pages/calendar.page.js
import { formatYmd } from "../core/time.js";

export function renderCalendarPage({ root, data, state, saveNow, recurringApi }) {
  const $ = (sel) => root.querySelector(sel);

  const todayYmd = formatYmd(new Date());
  const initial = parseYmd(todayYmd);
  let viewYear = initial.getFullYear();
  let viewMonth = initial.getMonth(); // 0-11
  let selectedYmd = todayYmd;

  if (!data.settings) data.settings = {};
  if (!data.settings.calendarNoDuePolicy) data.settings.calendarNoDuePolicy = "today";

  render();

  function render() {
    const monthStart = new Date(viewYear, viewMonth, 1);
    const gridStart = startOfCalendarGrid(monthStart);
    const days = buildGridDays(gridStart, 42);

    const agg = aggregateByDay(
      days,
      data.items || [],
      data.recurring || [],
      data.settings.calendarNoDuePolicy
    );

    const selectedCount = (agg.get(selectedYmd) || []).length;

    root.innerHTML = `
      <section class="card">
        <div class="row row--between">
          <h1 style="margin:0;">Calendar</h1>
          <div class="muted">Today: ${todayYmd}</div>
        </div>

        <div class="row row--between" style="margin-top:10px; gap:10px;">
          <div class="row" style="gap:8px;">
            <button id="prevBtn">←</button>
            <div style="min-width:160px; text-align:center;">
              <b>${viewYear}-${String(viewMonth + 1).padStart(2, "0")}</b>
            </div>
            <button id="nextBtn">→</button>
            <button id="todayBtn">今天</button>
          </div>

          <div class="row" style="gap:8px;">
            <span class="muted">無到期日顯示在：</span>
            <select id="noDuePolicy">
              <option value="today" ${data.settings.calendarNoDuePolicy === "today" ? "selected" : ""}>今天</option>
              <option value="createdDay" ${data.settings.calendarNoDuePolicy === "createdDay" ? "selected" : ""}>建立日</option>
            </select>
          </div>
        </div>

        <div class="muted" style="margin-top:8px;">
          說明：一般工作顯示在 dueAt 當天；Recurring 顯示在 nextDueDate 當天（⟳）。
        </div>
      </section>

      <!-- 當日清單（在月曆上方） -->
      <section class="card">
        <div class="row row--between">
          <h2 style="margin:0;">${selectedYmd}（${selectedCount}）</h2>
          <div class="muted">點月曆日期可切換</div>
        </div>
        <div id="dayList" class="list" style="margin-top:10px;"></div>
      </section>

      <!-- 月曆本體 -->
      <section class="card cal">
        <div class="cal__head">
          ${["日","一","二","三","四","五","六"].map(d => `<div class="muted">${d}</div>`).join("")}
        </div>

        <div class="cal__grid">
          ${days.map(({ ymd, inMonth, isToday }) => {
            const list = agg.get(ymd) || [];
            const count = list.length;

            const mini = list.slice(0, 3).map(it => {
              const isRec = it.__type === "recurring";
              const prefix = isRec ? "⟳ " : "";
              const doneCls = (!isRec && it.status === "done") ? "cal__miniItem--done" : "";
              return `
                <div class="cal__miniItem ${doneCls}">
                  ${prefix}${escapeHtml(it.title)}
                </div>
              `;
            }).join("");

            const more = (count > 3) ? `<div class="cal__more muted">+${count - 3}</div>` : "";

            const cls = [
              "cal__cell",
              inMonth ? "" : "cal__cell--out",
              isToday ? "cal__cell--today" : "",
              (ymd === selectedYmd) ? "cal__cell--selected" : "",
            ].filter(Boolean).join(" ");

            return `
              <button class="${cls}" data-day="${ymd}">
                <div class="cal__day">
                  <span>${Number(ymd.slice(8,10))}</span>
                  ${count ? `<span class="cal__count">${count}</span>` : `<span></span>`}
                </div>
                <div class="cal__mini">
                  ${mini}
                  ${more}
                </div>
              </button>
            `;
          }).join("")}
        </div>
      </section>
    `;

    $("#prevBtn").onclick = () => shiftMonth(-1);
    $("#nextBtn").onclick = () => shiftMonth(+1);
    $("#todayBtn").onclick = () => {
      const t = parseYmd(todayYmd);
      viewYear = t.getFullYear();
      viewMonth = t.getMonth();
      selectedYmd = todayYmd;
      render();
    };

    $("#noDuePolicy").onchange = () => {
      data.settings.calendarNoDuePolicy = $("#noDuePolicy").value;
      saveNow();
      render();
    };

    root.querySelectorAll("button[data-day]").forEach(btn => {
      btn.onclick = () => {
        selectedYmd = btn.dataset.day;
        render();
      };
    });

    renderDayList(agg);
  }

  function renderDayList(agg) {
    const list = (agg.get(selectedYmd) || []).slice();

    // 排序：Recurring 置頂；未完成在前；其餘依 updatedAt 新到舊
    list.sort((a, b) => {
      const ar = (a.__type === "recurring") ? 0 : 1;
      const br = (b.__type === "recurring") ? 0 : 1;
      if (ar !== br) return ar - br;

      const ad = (a.__type !== "recurring" && a.status === "done") ? 1 : 0;
      const bd = (b.__type !== "recurring" && b.status === "done") ? 1 : 0;
      if (ad !== bd) return ad - bd;

      const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bt - at;
    });

    const html = list.length ? list.map(it => {
      const isRec = it.__type === "recurring";

      if (isRec) {
        const canDone = !!recurringApi;
        return `
          <div class="item">
            <div>
              <div class="title">⟳ ${escapeHtml(it.title)}</div>
              <div class="muted">next due: <b>${escapeHtml(it.nextDueDate)}</b></div>
            </div>
            <div class="btns">
              <button data-rec-done="${it.id}" ${canDone ? "" : "disabled"}>完成</button>
            </div>
          </div>
        `;
      }

      // ✅ 一般 items：多一顆「前往 Work」
      return `
        <div class="item">
          <div>
            <div class="title">${escapeHtml(it.title)}</div>
            <div class="muted">
              status: <b>${escapeHtml(it.status)}</b>
              ${it.dueAt ? ` · due: <b>${escapeHtml(it.dueAt)}</b>` : ` · due: <b>（無）</b>`}
            </div>
          </div>
          <div class="btns">
            <button class="btnSmall" data-go-work="${it.id}">前往 Work</button>
            <button data-cal-to="active" data-id="${it.id}">A</button>
            <button data-cal-to="waiting" data-id="${it.id}">W</button>
            <button data-cal-to="paused" data-id="${it.id}">P</button>
            <button data-cal-to="done" data-id="${it.id}">D</button>
          </div>
        </div>
      `;
    }).join("") : `<div class="muted">（無）</div>`;

    $("#dayList").innerHTML = html;

    // ✅ 前往 Work（focus）
    root.querySelectorAll("button[data-go-work]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.goWork;
        location.href = `index.html?focus=${encodeURIComponent(id)}`;
      };
    });

    // items：狀態切換
    root.querySelectorAll("button[data-cal-to]").forEach(btn => {
      btn.onclick = () => {
        state.changeStatus(btn.dataset.id, btn.dataset.calTo);
        saveNow();
        render();
      };
    });

    // recurring：完成
    root.querySelectorAll("button[data-rec-done]").forEach(btn => {
      btn.onclick = () => {
        if (!recurringApi) return;
        recurringApi.markDone(btn.dataset.recDone);
        saveNow();
        render();
      };
    });
  }

  function shiftMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    render();
  }

  function aggregateByDay(days, items, recurring, noDuePolicy) {
    const daySet = new Set(days.map(d => d.ymd));
    const map = new Map();

    function push(ymd, obj) {
      if (!daySet.has(ymd)) return;
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd).push(obj);
    }

    // items
    for (const it of items) {
      if (!it) continue;

      if (it.dueAt) {
        push(it.dueAt, it);
        continue;
      }

      if (noDuePolicy === "today") {
        push(todayYmd, it);
      } else if (noDuePolicy === "createdDay") {
        const createdYmd = it.createdAt ? it.createdAt.slice(0, 10) : null;
        if (createdYmd) push(createdYmd, it);
      } else {
        push(todayYmd, it);
      }
    }

    // recurring
    for (const r of recurring) {
      if (!r || !r.nextDueDate) continue;
      push(r.nextDueDate, {
        __type: "recurring",
        id: r.id,
        title: r.name,
        nextDueDate: r.nextDueDate,
        updatedAt: r.updatedAt || null,
      });
    }

    return map;
  }

  function startOfCalendarGrid(monthStart) {
    const x = new Date(monthStart);
    x.setHours(0, 0, 0, 0);
    const day = x.getDay(); // 0=Sun
    x.setDate(x.getDate() - day);
    return x;
  }

  function buildGridDays(start, n) {
    const out = [];
    const m = viewMonth;
    const y = viewYear;

    for (let i = 0; i < n; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);

      const ymd = formatYmd(d);
      const inMonth = (d.getFullYear() === y && d.getMonth() === m);
      const isToday = (ymd === todayYmd);

      out.push({ ymd, inMonth, isToday });
    }
    return out;
  }

  function parseYmd(ymd) {
    const [yy, mm, dd] = ymd.split("-").map(Number);
    return new Date(yy, mm - 1, dd, 0, 0, 0, 0);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}
