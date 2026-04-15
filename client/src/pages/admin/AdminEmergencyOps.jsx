import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  adminCancelEmergencyRelay,
  adminReassignEmergencyRelay,
  getAdminEmergencyRelays,
  getAdminEmergencyStats,
} from "../../services/adminEmergencyService";

const statusOptions = [
  "all",
  "broadcasting",
  "claimed",
  "delivered",
  "cancelled",
];

const AdminEmergencyOps = () => {
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [relays, setRelays] = useState([]);
  const [newAgentIds, setNewAgentIds] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: relayData }, { data: statsData }] = await Promise.all([
        getAdminEmergencyRelays({ status, limit: 30 }),
        getAdminEmergencyStats(),
      ]);
      setRelays(Array.isArray(relayData?.relays) ? relayData.relays : []);
      setStats(statsData?.stats || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const kpis = useMemo(() => {
    return [
      { label: "Total", value: stats?.totalRelays ?? 0 },
      { label: "Active now", value: stats?.activeNow ?? 0 },
      { label: "Avg claim (min)", value: stats?.avgClaimTimeMinutes ?? 0 },
      { label: "Unclaimed %", value: stats?.unclaimedRate ?? 0 },
    ];
  }, [stats]);

  const onCancel = async (relayId) => {
    const reason =
      window.prompt("Reason for admin cancel", "Admin override") ||
      "Admin override";
    await adminCancelEmergencyRelay(relayId, reason);
    await load();
  };

  const onReassign = async (relayId) => {
    const newAgentId = String(newAgentIds[relayId] || "").trim();
    if (!newAgentId) {
      window.alert("Enter a delivery agent ID first");
      return;
    }
    await adminReassignEmergencyRelay(relayId, newAgentId);
    await load();
  };

  return (
    <AdminLayout title="Emergency Operations">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          {kpis.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {item.value}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-black text-white">Relay Queue</h2>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-[#2a3b62] bg-[#0a0f1e] px-3 py-2 text-sm text-slate-100"
            >
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-300">
              Loading emergency relays...
            </p>
          ) : !relays.length ? (
            <p className="mt-4 text-sm text-slate-300">No relays found.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {relays.map((relay) => (
                <article
                  key={relay._id}
                  className="rounded-xl border border-[#1f2e4c] bg-[#0a1222] p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {relay.userId?.name || "Patient"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {relay.status} •{" "}
                        {new Date(relay.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-200"
                        onClick={() => onCancel(relay._id)}
                      >
                        Cancel relay
                      </button>
                      <input
                        value={newAgentIds[relay._id] || ""}
                        onChange={(e) =>
                          setNewAgentIds((prev) => ({
                            ...prev,
                            [relay._id]: e.target.value,
                          }))
                        }
                        placeholder="New delivery agent ID"
                        className="w-48 rounded-lg border border-[#2a3b62] bg-[#0a0f1e] px-3 py-2 text-xs text-slate-100"
                      />
                      <button
                        className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-xs font-bold text-cyan-200"
                        onClick={() => onReassign(relay._id)}
                      >
                        Reassign
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminEmergencyOps;
