// src/app.js
import { load, save, reset, exportData, importData } from "./core/store.js";
import { createState } from "./core/state.js";

import { renderWorkPage } from "./pages/work.page.js";
import { renderDashboardPage } from "./pages/dashboard.page.js";
import { renderSettingsPage } from "./pages/settings.page.js";

import { registerWipPlugin } from "./plugins/wip.plugin.js";
import { registerDashboardPlugin } from "./plugins/dashboard.plugin.js";
import { registerRecurringPlugin } from "./plugins/recurring.plugin.js";

const data = load();
const state = createState(data);
const root = document.getElementById("app");

function saveNow() { save(data); }

// 主頁 Notice
let noticeText = "";
function renderNotice(text) {
  noticeText = text;
  const el = root.querySelector("#notice");
  if (el) el.textContent = text;
}

// Dashboard rerender hook
const dashboardRerenderHook = { current: null };
function notifyDashboard() {
  if (typeof dashboardRerenderHook.current === "function") dashboardRerenderHook.current();
}

// 註冊插件（以後擴充就在這裡加一行）
registerWipPlugin({ data, renderNotice });
const dashboardApi = registerDashboardPlugin({ data, notifyDashboard });
const recurringApi = registerRecurringPlugin({ data });

// 給 settings.page.js 用（封裝匯出）
window.__EXPORT__ = () => exportData(data);

function importNow(jsonText) {
  const merged = importData(jsonText);
  // 直接覆蓋 data 內容（保持引用不變）
  data.settings = merged.settings;
  data.items = merged.items;
  data.events = merged.events;
  data.recurring = merged.recurring;
  data.logEntries = merged.logEntries;
  saveNow();
  notifyDashboard();
}

function resetNow() {
  reset();
  const fresh = load();
  data.settings = fresh.settings;
  data.items = fresh.items;
  data.events = fresh.events;
  data.recurring = fresh.recurring;
  data.logEntries = fresh.logEntries;
  saveNow();
  notifyDashboard();
}

const path = location.pathname.split("/").pop() || "index.html";

if (path === "index.html") {
  renderWorkPage({ root, data, state, saveNow, noticeText, recurringApi });
} else if (path === "dashboard.html") {
  renderDashboardPage({ root, data, dashboardApi, rerenderHook: dashboardRerenderHook });
} else if (path === "settings.html") {
  renderSettingsPage({
    root,
    data,
    saveNow,
    importNow,
    resetNow,
  });
} else {
  root.innerHTML = `<div class="card"><h1>Unknown Page</h1></div>`;
}
