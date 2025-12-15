// src/pages/work.page.js
export function renderWorkPage({ root, data, state, saveNow, noticeText, recurringApi }) {
  root.innerHTML = `
    <section class="card">
      <h1>Work</h1>
      <div class="row">
        <input id="newTitle" placeholder="新增工作（直接打字）"/>
        <button id="addBtn">新增</button>
      </div>
      <div id="notice" class="notice">${noticeText || ""}</div>
    </section>

    <section class="card">
      <h2>Recurring</h2>
      <div class="row">
        <input id="recName" placeholder="例如：兩週報告 / 輪替報告"/>
        <input id="recAnchor" type="date"/>
        <input id="recPeriod" type="number" min="1" value="14" title="週期天數"/>
        <button id="recAddBtn">新增</button>
      </div>
      <div class="muted" style="margin-top:8px;">
        固定週期（例如 14 天）＋固定 anchor 到期日 → 會固定落在同星期。
      </div>
      <div id="recList" class="list" style="margin-top:10px;"></div>
    </section>

    <section class="grid">
      <div class="card"><h2>Active</h2><div id="list-active"></div></div>
      <div class="card"><h2>Waiting</h2><div id="list-waiting"></div></div>
      <div class="card"><h2>Paused</h2><div id="list-paused"></div></div>
      <div class="card">
        <h2>Done <span class="muted">(折疊)</span></h2>
        <details><summary>展開</summary><div id="list-done"></div></details>
      </div>
    </section>
  `;

  const $ = (id) => root.querySelector(id);

  function renderLists() {
    const groups = {
      active: data.items.filter(x => x.status === "active"),
      waiting: data.items.filter(x => x.status === "waiting"),
      paused: data.items.filter(x => x.status === "paused"),
      done: data.items.filter(x => x.status === "done"),
    };

    const renderGroup = (arr) => arr.map(item => `
      <div class="item">
        <div class="title">${escapeHtml(item.title)}</div>
        <div class="btns">
          <button data-id="${item.id}" data-to="active">A</button>
          <button data-id="${item.id}" data-to="waiting">W</button>
          <button data-id="${item.id}" data-to="paused">P</button>
          <button data-id="${item.id}" data-to="done">D</button>
        </div>
      </div>
    `).join("");

    $("#list-active").innerHTML = renderGroup(groups.active);
    $("#list-waiting").innerHTML = renderGroup(groups.waiting);
    $("#list-paused").innerHTML = renderGroup(groups.paused);
    $("#list-done").innerHTML = renderGroup(groups.done);

    root.querySelectorAll("button[data-id]").forEach(btn => {
      btn.onclick = () => {
        state.changeStatus(btn.dataset.id, btn.dataset.to);
        saveNow();
        renderLists();
      };
    });
  }

  function renderRecurring() {
    if (!recurringApi) {
      $("#recList").innerHTML = `<div class="muted">（Recurring plugin 未載入）</div>`;
      return;
    }
    const list = recurringApi.listWithStatus();
    if (!list.length) {
      $("#recList").innerHTML = `<div class="muted">（尚無週期性事項）</div>`;
      return;
    }
    $("#recList").innerHTML = list.map(r => `
      <div class="item">
        <div>
          <div class="title">${escapeHtml(r.name)}</div>
          <div class="muted">
            下次：<b>${escapeHtml(r.nextDueDate)}</b>
            ${r.badge ? ` · <span class="badge">${escapeHtml(r.badge)}</span>` : ""}
          </div>
        </div>
        <div class="btns">
          <button data-rec-done="${r.id}">完成</button>
          <button data-rec-del="${r.id}">刪除</button>
        </div>
      </div>
    `).join("");

    root.querySelectorAll("button[data-rec-done]").forEach(btn => {
      btn.onclick = () => {
        recurringApi.markDone(btn.dataset.recDone);
        saveNow();
        renderRecurring();
      };
    });
    root.querySelectorAll("button[data-rec-del]").forEach(btn => {
      btn.onclick = () => {
        const ok = confirm("確定要刪除這個週期性事項嗎？");
        if (!ok) return;
        recurringApi.removeRecurring(btn.dataset.recDel);
        saveNow();
        renderRecurring();
      };
    });
  }

  $("#addBtn").onclick = () => {
    const title = $("#newTitle").value.trim();
    if (!title) return;
    state.addItem(title);
    $("#newTitle").value = "";
    saveNow();
    renderLists();
  };

  // Recurring 新增：name + anchorDueDate + periodDays
  $("#recAddBtn").onclick = () => {
    if (!recurringApi) return;
    const name = $("#recName").value.trim();
    const anchorDueDate = $("#recAnchor").value; // YYYY-MM-DD
    const periodDays = Number($("#recPeriod").value);
    if (!name || !anchorDueDate || !Number.isFinite(periodDays) || periodDays < 1) return;

    recurringApi.createRecurring({ name, periodDays, anchorDueDate });
    $("#recName").value = "";
    saveNow();
    renderRecurring();
  };

  renderLists();
  renderRecurring();
}

function escapeHtml(s) {
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
