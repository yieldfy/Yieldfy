import { Bell, CheckCheck, Trash2, X, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, type Notification } from "@/providers/NotificationsProvider";

const formatRelative = (ts: number) => {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
};

const dotColor = (level: Notification["level"]) => {
  switch (level) {
    case "success":
      return "bg-[#2EC4B6]";
    case "warning":
      return "bg-[#E0A458]";
    case "error":
      return "bg-[#E84855]";
    default:
      return "bg-[#5B8DEF]";
  }
};

const NotificationsBell = () => {
  const { items, unreadCount, markAllRead, clear, remove } = useNotifications();
  const [open, setOpen] = useState(false);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) {
      // mark read shortly after open so the badge clears once the user sees them
      setTimeout(markAllRead, 400);
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#0F1923]/70 hover:bg-white/50 transition-colors"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E84855] px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] p-0 border-[#0F1923]/10 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#0F1923]/8">
          <span className="font-barlow text-sm font-medium text-[#0F1923]">Notifications</span>
          <div className="flex items-center gap-1">
            {items.some((n) => !n.read) && (
              <button
                onClick={markAllRead}
                title="Mark all read"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#0F1923]/60 hover:bg-[#0F1923]/[0.06]"
              >
                <CheckCheck size={14} />
              </button>
            )}
            {items.length > 0 && (
              <button
                onClick={clear}
                title="Clear all"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#0F1923]/60 hover:bg-[#0F1923]/[0.06]"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[#0F1923]/50">
              You're all caught up.
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`group relative flex gap-3 border-b border-[#0F1923]/[0.06] px-4 py-3 last:border-b-0 ${
                  n.read ? "" : "bg-[#2EC4B6]/[0.04]"
                }`}
              >
                <span className={`mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full ${dotColor(n.level)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-[#0F1923]">{n.title}</p>
                    <span className="flex-shrink-0 text-[10px] text-[#0F1923]/40">{formatRelative(n.createdAt)}</span>
                  </div>
                  {n.body && <p className="mt-0.5 text-xs text-[#0F1923]/60">{n.body}</p>}
                  {n.href && (
                    <a
                      href={n.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#0F1923]/70 hover:text-[#0F1923]"
                    >
                      View <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <button
                  onClick={() => remove(n.id)}
                  title="Dismiss"
                  className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-md text-[#0F1923]/40 opacity-0 hover:bg-[#0F1923]/[0.06] hover:text-[#0F1923]/80 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
