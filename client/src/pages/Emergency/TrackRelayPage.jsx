import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { getRelayByToken } from "../../services/emergencyService";

const statusClass = (status) => {
  const key = String(status || "").toLowerCase();
  if (key === "claimed") return "bg-primary/15 text-primary border-primary/30";
  if (key === "delivered")
    return "bg-success/15 text-success border-success/30";
  if (key === "cancelled") return "bg-danger/15 text-danger border-danger/30";
  return "bg-warning/15 text-warning border-warning/30";
};

const formatTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const TrackRelayPage = () => {
  const { token } = useParams();
  const [relay, setRelay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data } = await getRelayByToken(token);
        if (!mounted) return;
        setRelay(data?.relay || null);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || "Unable to load tracking");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const center = useMemo(() => {
    if (relay?.location) {
      return [Number(relay.location.lat), Number(relay.location.lng)];
    }
    return [22.5726, 88.3639];
  }, [relay]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background-light flex items-center justify-center px-4">
        <div className="rounded-2xl border border-border-subtle bg-white px-6 py-5 text-ink-soft">
          Loading tracking details...
        </div>
      </main>
    );
  }

  if (error || !relay) {
    return (
      <main className="min-h-screen bg-background-light flex items-center justify-center px-4">
        <div className="rounded-2xl border border-danger/30 bg-danger/10 px-6 py-5 text-danger font-semibold">
          {error || "Relay not found"}
        </div>
      </main>
    );
  }

  const resolved = ["delivered", "cancelled"].includes(
    String(relay.status || "").toLowerCase(),
  );

  return (
    <main className="min-h-screen bg-background-light px-4 py-8">
      <section className="mx-auto max-w-3xl rounded-[28px] border border-border-subtle bg-white p-5 md:p-8 space-y-5 shadow-soft">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft font-black">
            Emergency relay tracking
          </p>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-black text-ink">SwiftPharma SOS</h1>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(relay.status)}`}
            >
              {relay.status}
            </span>
          </div>
        </header>

        <div className="rounded-2xl overflow-hidden border border-border-subtle">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: "280px", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CircleMarker
              center={center}
              radius={10}
              pathOptions={{
                color: "var(--sos-primary-color)",
                fillColor: "var(--sos-primary-color)",
              }}
            />
          </MapContainer>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-slate-50 p-4 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft font-black">
            Medicines requested
          </p>
          <ul className="space-y-2 text-sm text-ink">
            {relay.medicines.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="flex justify-between"
              >
                <span>{item.name}</span>
                <span className="text-ink-soft">{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 md:grid-cols-2 text-sm text-ink-soft">
          <p>Created: {formatTime(relay.createdAt)}</p>
          <p>
            ETA:{" "}
            {relay.estimatedArrival
              ? formatTime(relay.estimatedArrival)
              : "Waiting for claim"}
          </p>
        </div>

        {resolved ? (
          <div className="rounded-2xl border border-border-subtle bg-white px-4 py-3 text-sm text-ink-soft">
            This SOS relay is now resolved.
          </div>
        ) : null}

        <footer className="pt-3 border-t border-border-subtle text-center text-xs text-ink-muted">
          Powered by SwiftPharma
        </footer>
      </section>
    </main>
  );
};

export default TrackRelayPage;
