import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import {
  getRelayHistory,
  reorderRelayHistory,
} from "../../services/emergencyService";

const EmergencyHistoryPage = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [reorderResult, setReorderResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getRelayHistory({ limit: 20 });
      setHistory(Array.isArray(data?.history) ? data.history : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onReorder = async (historyId) => {
    const { data } = await reorderRelayHistory(historyId);
    setReorderResult(data || null);
    await load();
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-28">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black text-ink">
            Emergency Relay History
          </h1>
          <Link to="/emergency" className="text-sm font-semibold text-primary">
            Back to SOS
          </Link>
        </div>

        {loading ? (
          <div className="panel-soft rounded-3xl p-6 text-sm text-ink-soft">
            Loading history...
          </div>
        ) : !history.length ? (
          <div className="panel-soft rounded-3xl p-6 text-sm text-ink-soft">
            No relay history yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {history.map((item) => (
              <article key={item._id} className="panel-soft rounded-3xl p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-black text-ink">
                    {new Date(item.requestedAt).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
                    {item.status}
                  </p>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                  {(item.medicines || []).map((med, idx) => (
                    <li
                      key={`${item._id}-${idx}`}
                      className="flex justify-between"
                    >
                      <span>{med.name}</span>
                      <span>{med.quantity}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onReorder(item._id)}
                  className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"
                >
                  Reorder available medicines
                </button>
              </article>
            ))}
          </div>
        )}

        {reorderResult ? (
          <section className="mt-8 rounded-3xl border border-border-subtle bg-white p-5">
            <h2 className="text-lg font-black text-ink">
              Latest Reorder Summary
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Added:{" "}
              {Array.isArray(reorderResult.added)
                ? reorderResult.added.length
                : 0}{" "}
              medicines
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Not found:{" "}
              {Array.isArray(reorderResult.notFound)
                ? reorderResult.notFound.length
                : 0}{" "}
              medicines
            </p>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
};

export default EmergencyHistoryPage;
