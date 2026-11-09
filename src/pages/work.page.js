// src/pages/work.page.js
export function renderWorkPage({ root, data, state, saveNow, noticeText, recurringApi }) {
  root.innerHTML = `
    <section class="card">
      <h1>Work</h1>
      <div class="row">
        <input id="newTitle" placeholder="新增工作（直接打字）"/>
        <button id="addBtn">新增</button>
      </div>
      <div id="notice" class="notice" ${noticeText ? "" : "hidden"}>${escapeHtml(noticeText)}</div>
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

    <section class="board3">
      <div class="column card">
        <h2>Active</h2>
        <div class="column-body" id="list-active"></div>
      </div>

      <div class="column card">
        <h2>Waiting</h2>
        <div class="column-body" id="list-waiting"></div>
      </div>

      <div class="column card">
        <h2>Paused</h2>
        <div class="column-body" id="list-paused"></div>
      </div>
    </section>

    <section class="card">
      <h2>Done <span class="muted">(折疊)</span></h2>
      <details id="doneDetails">
        <summary>展開</summary>
        <div id="list-done"></div>
      </details>
    </section>
  `;

  const $ = (sel) => root.querySelector(sel);

  // ✅ 只在首次 render 成功定位一次
  let pendingFocusId = getFocusIdFromUrl();

  function renderLists() {
    const groups = {
      active: data.items.filter(x => x.status === "active"),
      waiting: data.items.filter(x => x.status === "waiting"),
      paused: data.items.filter(x => x.status === "paused"),
      done: data.items.filter(x => x.status === "done"),
    };

    const renderGroup = (arr) => arr.map(item => `
      <div class="item" data-item-id="${item.id}">
        <div class="title">${escapeHtml(item.title)}</div>

        <div class="meta muted" style="margin-top:6px;">
          Due:
          <input
            class="dueInput"
            type="date"
            data-due-id="${item.id}"
            value="${escapeHtml(item.dueAt || "")}"
          />
          <button class="btnSmall" data-clear-due="${item.id}" title="清除到期日">清除</button>
        </div>

        <div class="btns" style="margin-top:8px;">
          <button data-id="${item.id}" data-to="active">A</button>
          <button data-id="${item.id}" data-to="waiting">W</button>
          <button data-id="${item.id}" data-to="paused">P</button>
          <button data-id="${item.id}" data-to="done">D</button>
          <button data-edit="${item.id}">✎</button>
          <button data-del="${item.id}">🗑</button>
        </div>
      </div>
    `).join("");

    $("#list-active").innerHTML = renderGroup(groups.active);
    $("#list-waiting").innerHTML = renderGroup(groups.waiting);
    $("#list-paused").innerHTML = renderGroup(groups.paused);
    $("#list-done").innerHTML = renderGroup(groups.done);

    // 狀態切換
    root.querySelectorAll("button[data-id]").forEach(btn => {
      btn.onclick = () => {
        state.changeStatus(btn.dataset.id, btn.dataset.to);
        saveNow();
        renderLists();
      };
    });

    // 刪除
    root.querySelectorAll("button[data-del]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.del;
        const item = data.items.find(x => x.id === id);
        if (!item) return;
        if (!confirm(`確定要刪除「${item.title}」嗎？此操作無法復原。`)) return;
        state.removeItem(id);
        saveNow();
        renderLists();
      };
    });

    // 設定 dueAt
    root.querySelectorAll("input[data-due-id]").forEach(inp => {
      inp.onchange = () => {
        const id = inp.dataset.dueId;
        const ymd = inp.value || null;
        state.setDueAt(id, ymd);
        saveNow();
        renderLists();
      };
    });

    // 清除 dueAt
    root.querySelectorAll("button[data-clear-due]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.clearDue;
        state.setDueAt(id, null);
        saveNow();
        renderLists();
      };
    });

    // ✎ 編輯標題
    root.querySelectorAll("button[data-edit]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.edit;
        const item = data.items.find(x => x.id === id);
        if (!item) return;
    
        const next = prompt("編輯標題：", item.title);
        if (next === null) return;      // 使用者按取消
        const trimmed = next.trim();
        if (!trimmed) return;           // 空字串不處理
    
        state.setTitle(id, trimmed);
        saveNow();
        renderLists();
      };
    });

    // ✅ Focus：若有 focus id，render 完後定位並高亮（只做一次）
    if (pendingFocusId) {
      focusItemOnce(pendingFocusId);
      pendingFocusId = null;
      clearFocusFromUrl();
    }

  }

  function renderRecurring() {
  if (!recurringApi) {
    $("#recList").innerHTML = `<div class="muted">（Recurring plugin 未載入）</div>`;
    return;
  }

  const list = recurringApi.listWithStatus({ upcomingDays: data.settings?.upcomingDays ?? 3 });
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
        <button data-rec-edit="${r.id}">✎</button>
        <button data-rec-done="${r.id}">完成</button>
        <button data-rec-del="${r.id}">刪除</button>
      </div>
    </div>
  `).join("");

  // ✅ 用「事件代理」：不怕你 future render / DOM 變動 / 綁定漏掉
  $("#recList").onclick = (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    // 完成
    if (btn.dataset.recDone) {
      recurringApi.markDone(btn.dataset.recDone);
      saveNow();
      renderRecurring();
      return;
    }

    // 刪除
    if (btn.dataset.recDel) {
      const r = (data.recurring || []).find(x => x.id === btn.dataset.recDel);
      if (!confirm(`確定要刪除週期性事項「${r ? r.name : ""}」嗎？此操作無法復原。`)) return;
      recurringApi.removeRecurring(btn.dataset.recDel);
      saveNow();
      renderRecurring();
      return;
    }

    // 編輯
    if (btn.dataset.recEdit) {
      const id = btn.dataset.recEdit;
      const r = (data.recurring || []).find(x => x.id === id);
      if (!r) return;

      const nextName = prompt("編輯名稱：", r.name);
      if (nextName === null) return;

      const nextPeriod = prompt("編輯週期天數（>=1）：", String(r.periodDays));
      if (nextPeriod === null) return;

      const nextAnchor = prompt("編輯 anchor 到期日（YYYY-MM-DD）：", r.anchorDueDate);
      if (nextAnchor === null) return;

      recurringApi.updateRecurring(id, {
        name: nextName,
        periodDays: Number(nextPeriod),
        anchorDueDate: nextAnchor,
      });

      saveNow();
      renderRecurring();
      return;
    }
  };
}


  // 新增工作
  $("#addBtn").onclick = () => {
    const title = $("#newTitle").value.trim();
    if (!title) return;
    state.addItem(title);
    $("#newTitle").value = "";
    saveNow();
    renderLists();
  };

  // 新增 Recurring
  $("#recAddBtn").onclick = () => {
    if (!recurringApi) return;
    const name = $("#recName").value.trim();
    const anchorDueDate = $("#recAnchor").value;
    const periodDays = Number($("#recPeriod").value);
    if (!name || !anchorDueDate || !Number.isFinite(periodDays) || periodDays < 1) return;

    recurringApi.createRecurring({ name, periodDays, anchorDueDate });
    $("#recName").value = "";
    saveNow();
    renderRecurring();
  };

  renderLists();
  renderRecurring();

  // ===== Focus helpers =====

  function focusItemOnce(itemId) {
    const el = root.querySelector(`[data-item-id="${cssEscape(itemId)}"]`);
    if (!el) return;

    // 若在 Done 區塊，先展開 details（避免 scroll 到看不到）
    const doneDetails = $("#doneDetails");
    const inDone = !!el.closest("#list-done");
    if (inDone && doneDetails) doneDetails.open = true;

    // 捲動定位 + 高亮
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("focus-item");

    // 2 秒後淡出（你若不想淡出可刪掉這段）
    window.setTimeout(() => el.classList.remove("focus-item"), 2000);
  }

  function getFocusIdFromUrl() {
    const p = new URLSearchParams(location.search);
    return p.get("focus");
  }

  function clearFocusFromUrl() {
    // 把 ?focus=... 清掉，避免 re-render 又觸發
    history.replaceState({}, "", location.pathname);
  }

  function cssEscape(v) {
    // 簡易 escape，避免 UUID 裡不預期字元（保守）
    return String(v).replaceAll('"', '\\"');
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
