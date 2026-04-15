import { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import * as doseService from "../../services/doseService.js";

const DoseHistoryPage = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all"); // all, taken, missed, skipped
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await doseService.getDoseLogs({ days: 30 });
        setLogs(Array.isArray(data?.logs) ? data.logs : []);
      } catch (error) {
        console.error("Failed to load dose history", error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return logs;
    return logs.filter((l) => l.status === filter);
  }, [logs, filter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((log) => {
      const date = new Date(log.scheduledAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(log);
    });
    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    if (!logs.length) return { adherence: 0, streak: 0 };
    const taken = logs.filter((l) => l.status === "taken").length;
    const adherence = Math.round((taken / logs.length) * 100);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      const dayLogs = logs.filter((l) => {
        const logDate = new Date(l.scheduledAt).toISOString().split("T")[0];
        return logDate === dateStr;
      });
      if (!dayLogs.length) {
        if (i === 0) continue;
        break;
      }
      const allTaken = dayLogs.every((l) => l.status === "taken");
      if (allTaken) {
        streak += 1;
      } else {
        break;
      }
    }
    return { adherence, streak };
  }, [logs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Navbar />
        <main className="max-w-[1440px] mx-auto px-6 lg:px-12 pt-32 pb-24">
          <p className="text-slate-500">Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-6 lg:px-12 pt-32 pb-24">
        <h1 className="text-5xl font-black text-slate-900 dark:text-white">
          Dose History
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Last 30 days of medicine intake
        </p>

        {/* Stats */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 border border-slate-100 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              30-Day Adherence
            </p>
            <p className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
              {stats.adherence}%
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 border border-slate-100 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Current Streak
            </p>
            <p className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
              🔥 {stats.streak} days
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-8 flex gap-3 flex-wrap">
          {["all", "taken", "missed", "skipped"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-full text-sm font-bold capitalize transition-colors ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* History */}
        <div className="mt-12 space-y-8">
          {grouped.size > 0 ? (
            Array.from(grouped.entries()).map(([date, dayLogs]) => (
              <div key={date}>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                  {date}
                </h3>
                <div className="space-y-2">
                  {dayLogs.map((log) => (
                    <div
                      key={log._id}
                      className="bg-white dark:bg-slate-900 rounded-2xl px-6 py-4 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {log.medicineName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(log.scheduledAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-full text-xs font-bold capitalize ${
                          log.status === "taken"
                            ? "bg-success/20 text-success"
                            : log.status === "missed"
                              ? "bg-danger/20 text-danger"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {log.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-12 text-slate-500">
              No doses recorded for this filter
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DoseHistoryPage;
