import { on } from "../core/bus.js";

export function registerWipPlugin({ data, renderNotice }) {
  function check() {
    const limit = data.settings.wipLimitActive ?? 7;
    const active = data.items.filter(x => x.status === "active").length;
    renderNotice(active > limit ? `⚠ Active ${active}/${limit}：建議先完成或暫停其中一項` : "");
  }

  for (const t of ["status_change", "item_add", "item_remove"]) on(t, check);

  // 開頁時先算一次，讓 Work 頁一打開就能看到警告
  check();
}
