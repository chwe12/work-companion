import { on } from "../core/bus.js";

export function registerWipPlugin({ data, renderNotice }) {
  on("status_change", () => {
    const limit = data.settings.wipLimitActive ?? 7;
    const active = data.items.filter(x => x.status === "active").length;
    if (active > limit) renderNotice(`⚠ Active ${active}/${limit}：建議先完成或暫停其中一項`);
    else renderNotice("");
  });

  on("item_add", () => {
    const limit = data.settings.wipLimitActive ?? 7;
    const active = data.items.filter(x => x.status === "active").length;
    if (active > limit) renderNotice(`⚠ Active ${active}/${limit}：建議先完成或暫停其中一項`);
  });
}
