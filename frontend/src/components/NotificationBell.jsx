
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get("notifications/"),
        api.get("notifications/unread-count/"),
      ]);

      const notifications = Array.isArray(listRes.data.results)
  ? listRes.data.results
  : Array.isArray(listRes.data)
    ? listRes.data
    : [];

notifications.sort((a, b) => {
  // Unread notifications first
  if (a.is_read !== b.is_read) {
    return a.is_read ? 1 : -1;
  }

  // Latest notification first
  return new Date(b.created_at) - new Date(a.created_at);
});

setItems(notifications);

      setUnread(countRes.data.count ?? 0);
    } catch (err) {
      console.error("Notification loading error:", err);
    }
  }, []);

  useEffect(() => {
    load();

    const timer = setInterval(load, 60000);

    return () => clearInterval(timer);
  }, [load]);

  const handleClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.post(
          `notifications/${notification.id}/read/`
        );
      } catch (err) {
        console.error("Mark notification read error:", err);
      }
    }

    setOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }

    load();
  };

  const markAll = async () => {
    try {
      setLoading(true);

      await api.post("notifications/read-all/");

      await load();
    } catch (err) {
      console.error("Mark all notifications read error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "";

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative shrink-0">

      {/* Notification Bell */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#0B2D72] bg-red-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click Outside Overlay */}
          <div
            className="fixed inset-0 z-[60] bg-transparent"
            onClick={() => setOpen(false)}
          />

          {/* Notification Dropdown */}
          <div
            className="
              fixed right-4 top-20
              z-[70]
              w-[min(22rem,calc(100vw-2rem))]
              overflow-hidden
              rounded-2xl
              border border-slate-200
              bg-white
              text-slate-800
              shadow-2xl

              md:absolute
              md:left-full
              md:right-auto
              md:top-0
              md:ml-3
              md:w-[360px]
            "
          >

            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4">

              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800">
                  Notifications
                </h3>

                <p className="mt-0.5 text-xs text-slate-400">
                  {unread > 0
                    ? `${unread} unread notification${unread > 1 ? "s" : ""}`
                    : "You're all caught up"}
                </p>
              </div>

              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  disabled={loading}
                  className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                >
                  {loading ? "Please wait..." : "Mark all read"}
                </button>
              )}

            </div>

            {/* Notification List */}
            <div className="max-h-[min(65vh,420px)] overflow-y-auto overscroll-contain">

              {items.length === 0 ? (

                <div className="flex flex-col items-center justify-center px-5 py-12 text-center">

                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <svg
                      width="25"
                      height="25"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10 21h4" />
                    </svg>
                  </div>

                  <p className="text-sm font-semibold text-slate-600">
                    No notifications yet
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    New updates will appear here.
                  </p>

                </div>

              ) : (

                items.map((n) => (

                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`relative flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 ${
                      !n.is_read ? "bg-blue-50/60" : "bg-white"
                    }`}
                  >

                    <div className="flex w-full items-start gap-2">

                      <div className="min-w-0 flex-1">

                        <p className="break-words text-[13px] font-semibold leading-5 text-slate-800">
                          {n.title}
                        </p>

                      </div>

                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      )}

                    </div>

                    <p className="w-full break-words text-xs leading-5 text-slate-500">
                      {n.message}
                    </p>

                    <p className="mt-1 text-[10px] font-medium text-slate-400">
                      {formatDate(n.created_at)}
                    </p>

                  </button>

                ))

              )}

            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                <p className="text-center text-[10px] font-medium text-slate-400">
                  SMLNEXGEN Notification Center
                </p>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}
