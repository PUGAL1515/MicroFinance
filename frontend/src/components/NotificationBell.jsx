import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get("notifications/"),
        api.get("notifications/unread-count/"),
      ]);
      setItems(listRes.data.results || listRes.data || []);
      setUnread(countRes.data.count ?? 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.post(`notifications/${n.id}/read/`);
      } catch (e) {}
    }
    setOpen(false);
    if (n.link) navigate(n.link);
    load();
  };

  const markAll = async () => {
    try {
      await api.post("notifications/read-all/");
      load();
    } catch (e) {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10"
      >
        <svg
          width="20"
          height="20"
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
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-800">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="text-xs font-semibold text-blue-600"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-400">
                  No notifications yet
                </p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${
                      !n.is_read ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {n.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-slate-500">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(n.created_at).toLocaleString("en-IN")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}