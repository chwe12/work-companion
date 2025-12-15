// src/core/store.js
const KEY = "work_companion_v1";

const defaultData = {
  settings: {
    timezone: "Asia/Taipei",
    weekStart: "monday",
    wipLimitActive: 7,
    upcomingDays: 3,          // Recurring「即將到期」預設 3 天
  },
  items: [],
  events: [],
  recurring: [],
  logEntries: [],
};

export function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return structuredClone(defaultData);
  try {
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultData), ...parsed };
  } catch {
    return structuredClone(defaultData);
  }
}

export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function reset() {
  localStorage.setItem(KEY, JSON.stringify(defaultData));
}

export function exportData(data) {
  // 直接輸出整包，方便備份/搬家
  return JSON.stringify(data, null, 2);
}

export function importData(jsonText) {
  // MVP：覆蓋匯入（最穩、最不容易變混亂）
  const parsed = JSON.parse(jsonText);

  // 合併 default 以避免缺欄位
  const merged = { ...structuredClone(defaultData), ...parsed };
  // 深層補 default settings
  merged.settings = { ...structuredClone(defaultData.settings), ...(parsed.settings || {}) };

  return merged;
}
