// src/pages/settings.page.js
export function renderSettingsPage({ root, data, saveNow, importNow, resetNow }) {
  root.innerHTML = `
    <section class="card">
      <h1>Settings</h1>
      <p class="muted">資料儲存在本機（localStorage）。建議定期匯出備份。</p>
    </section>

    <section class="card">
      <h2>Core</h2>

      <div class="form">
        <label class="label">Active 上限（WIP Limit）</label>
        <div class="row">
          <input id="wipLimit" type="number" min="1" max="50" value="${data.settings?.wipLimitActive ?? 7}" />
          <button id="saveWipBtn">儲存</button>
        </div>
        <div class="muted">你已設定：Active 超過上限只警示、不鎖死。</div>
      </div>

      <div class="form">
        <label class="label">Recurring 即將到期提醒天數</label>
        <div class="row">
          <input id="upcomingDays" type="number" min="0" max="30" value="${data.settings?.upcomingDays ?? 3}" />
          <button id="saveUpcomingBtn">儲存</button>
        </div>
        <div class="muted">例如 3：到期前 3 天開始顯示「即將到期」。</div>
      </div>

      <div class="form">
        <label class="label">本週定義</label>
        <div class="muted">週一～週日（已固定，符合你的需求）</div>
      </div>
    </section>

    <section class="card">
      <h2>Backup</h2>

      <div class="row">
        <button id="exportBtn">匯出 JSON</button>
        <label class="btnLike">
          匯入 JSON（覆蓋）
          <input id="importFile" type="file" accept="application/json" hidden />
        </label>
      </div>

      <div id="importHint" class="muted" style="margin-top:10px;"></div>
    </section>

    <section class="card">
      <h2>Danger Zone</h2>
      <div class="row">
        <button id="resetBtn">重置所有資料</button>
      </div>
      <div class="muted" style="margin-top:10px;">重置會清空 items / log / recurring / events。</div>
    </section>
  `;

  const $ = (sel) => root.querySelector(sel);

  $("#saveWipBtn").onclick = () => {
    const v = Number($("#wipLimit").value);
    if (!Number.isFinite(v) || v < 1) return;
    data.settings.wipLimitActive = v;
    saveNow();
    toast("已儲存 WIP Limit");
  };

  $("#saveUpcomingBtn").onclick = () => {
    const v = Number($("#upcomingDays").value);
    if (!Number.isFinite(v) || v < 0) return;
    data.settings.upcomingDays = v;
    saveNow();
    toast("已儲存提醒天數");
  };

  $("#exportBtn").onclick = () => {
    const jsonText = exportNow();
    downloadText(jsonText, `work-companion-backup-${new Date().toISOString().slice(0,10)}.json`);
  };

  $("#importFile").onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      importNow(text);
      $("#importHint").textContent = "匯入完成（已覆蓋資料）。";
      toast("匯入完成");
    } catch (err) {
      $("#importHint").textContent = "匯入失敗：JSON 格式不正確或資料結構不符。";
    } finally {
      e.target.value = "";
    }
  };

  $("#resetBtn").onclick = () => {
    const ok = confirm("確定要重置所有資料嗎？此操作無法復原。建議先匯出備份。");
    if (!ok) return;
    resetNow();
    toast("已重置");
  };

  // 由 app.js 注入
  function exportNow() {
    return window.__EXPORT__();
  }

  function toast(msg) {
    // 極簡提示（避免干擾）
    console.log(msg);
  }

  function downloadText(text, filename) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
