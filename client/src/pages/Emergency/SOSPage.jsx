import { useContext, useEffect, useMemo, useState } from "react";
import {
  Ambulance,
  CheckCircle2,
  Clock3,
  Copy,
  HeartPulse,
  MapPin,
  Pill,
  PhoneCall,
  Share2,
  X,
} from "lucide-react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Button from "../../components/common/Button";
import { AuthContext } from "../../context/AuthContext";
import { createRelay, logAmbulanceCall, triageSymptoms } from "../../services/emergencyService";
import { useHealthCompanion } from "../../context/HealthCompanionContext";

const defaultCenter = [22.5726, 88.3639];

const EMERGENCY_PHASES = [
  {
    title: "EMERGENCY SERVICES ACTIVATED",
    detail: "We have started the urgent response flow and captured your location.",
  },
  {
    title: "Connecting to ambulance dispatch…",
    detail: "Your request is being routed to the nearest available ambulance.",
  },
  {
    title: "Ambulance requested",
    detail: "Dispatch has been alerted and the call log is stored for follow-up.",
  },
  {
    title: "Nearest ambulance assigned",
    detail: "The closest response unit is being assigned to your location.",
  },
];

const EMERGENCY_MEDICINES = [
  "Paracetamol 650",
  "ORS",
  "Pantoprazole",
  "Ondansetron",
  "Inhaler",
  "Nebulizer Respule",
  "Antiseptic",
  "Bandage",
];

const createPulseIcon = () =>
  L.divIcon({
    className: "sos-pulse-marker-shell",
    html: `
      <div class="sos-pulse-marker">
        <span class="pulse-ring pulse-ring-one"></span>
        <span class="pulse-ring pulse-ring-two"></span>
        <span class="pulse-ring pulse-ring-three"></span>
        <span class="pulse-core flex items-center justify-center text-[15px] font-black text-white">♥</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const createAmbulanceIcon = () =>
  L.divIcon({
    className: "agent-live-marker",
    html: `
      <span class="agent-live-ripple"></span>
      <span class="agent-live-dot">A</span>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const formatElapsed = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const SOSPage = () => {
  const { user } = useContext(AuthContext);
  const { openWithMessage } = useHealthCompanion();

  const [location, setLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [locState, setLocState] = useState("idle");
  const [active, setActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseReveal, setPhaseReveal] = useState(0);
  const [phaseText, setPhaseText] = useState("CALL AMBULANCE (108)");
  const [callingAmbulance, setCallingAmbulance] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [agentPosition, setAgentPosition] = useState(null);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [customMedicine, setCustomMedicine] = useState("");
  const [customQuantity, setCustomQuantity] = useState("1");
  const [relaySubmitting, setRelaySubmitting] = useState(false);
  const [medicineRelayState, setMedicineRelayState] = useState(null);
  const [triageInput, setTriageInput] = useState("");
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);

  const center = useMemo(
    () => (location ? [location.lat, location.lng] : defaultCenter),
    [location],
  );

  const etaText = useMemo(() => {
    if (!active) return "ETA pending";
    if (!callStartedAt) return "~15 min";
    const remaining = Math.max(0, 15 * 60 * 1000 - elapsedMs);
    return `${Math.max(1, Math.ceil(remaining / 60000))} min`;
  }, [active, callStartedAt, elapsedMs]);

  const currentPhase = EMERGENCY_PHASES[Math.min(phaseIndex, EMERGENCY_PHASES.length - 1)];
  const statusNote = active ? currentPhase.title : "Tap once to start the emergency response";

  useEffect(() => {
    let mounted = true;

    const loadLocation = () => {
      if (!navigator.geolocation) {
        setLocState("error");
        setLocation({ lat: defaultCenter[0], lng: defaultCenter[1] });
        setLocationAddress("Location services unavailable");
        return;
      }

      // Get best accuracy with progressive refinement
      let bestAccuracy = Infinity;
      let bestLocation = null;
      let refineCount = 0;
      const maxRefines = 3;

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!mounted) return;
          
          const accuracy = Number(position.coords.accuracy || 999);
          const currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy,
          };

          // Always set first position
          if (!bestLocation) {
            bestLocation = currentLocation;
            bestAccuracy = accuracy;
            setLocation(currentLocation);
            setLocationAddress(`Location detected (${Math.round(accuracy)}m accuracy)`);
            setLocState("ready");
          }
          // Update if accuracy improves
          else if (accuracy < bestAccuracy) {
            bestLocation = currentLocation;
            bestAccuracy = accuracy;
            setLocation(currentLocation);
            setLocationAddress(`Location refined (${Math.round(accuracy)}m accuracy)`);
          }

          refineCount++;
          // Stop after getting good accuracy or max attempts
          if (accuracy < 50 || refineCount >= maxRefines) {
            navigator.geolocation.clearWatch(watchId);
          }
        },
        () => {
          if (!mounted) return;
          setLocation({ lat: defaultCenter[0], lng: defaultCenter[1] });
          setLocationAddress("Location permission not granted yet");
          setLocState("error");
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
      );
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!active) return undefined;

    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - (callStartedAt || Date.now()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active, callStartedAt]);

  useEffect(() => {
    if (!active) {
      setPhaseIndex(0);
      setPhaseReveal(0);
      setPhaseText("CALL AMBULANCE (108)");
      setAgentPosition(null);
      return undefined;
    }

    const stages = [
      "EMERGENCY SERVICES ACTIVATED",
      "Connecting to ambulance dispatch…",
      "Ambulance requested",
      "Nearest ambulance assigned",
    ];

    let cancelled = false;
    setPhaseIndex(0);
    setPhaseText(stages[0]);
    setPhaseReveal(0);

    const advance = (index) => {
      if (cancelled) return;
      const nextTitle = stages[Math.min(index, stages.length - 1)];
      setPhaseIndex(Math.min(index, stages.length - 1));
      setPhaseText(nextTitle);
      setPhaseReveal(0);

      const revealTimer = window.setInterval(() => {
        setPhaseReveal((value) => {
          if (value >= nextTitle.length) {
            window.clearInterval(revealTimer);
            return value;
          }
          return value + 1;
        });
      }, 18);

      window.setTimeout(() => window.clearInterval(revealTimer), 1200);
    };

    const timers = [0, 2200, 4700, 7600].map((delay, index) =>
      window.setTimeout(() => advance(index), delay),
    );

    if (location) {
      setAgentPosition({ lat: location.lat + 0.01, lng: location.lng + 0.01 });
      const moveTimer = window.setInterval(() => {
        setAgentPosition((prev) => {
          if (!prev || !location) return prev;
          return {
            lat: prev.lat + (location.lat - prev.lat) * 0.18,
            lng: prev.lng + (location.lng - prev.lng) * 0.18,
          };
        });
      }, 3000);

      timers.push(moveTimer);
    }

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [active, location]);

  const handleRefreshLocation = () => {
    setLocState("loading");
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = Number(position.coords.accuracy || 999);
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy,
        };
        setLocation(nextLocation);
        setLocationAddress(`Location updated (${Math.round(accuracy)}m)`);
        setLocState("ready");
      },
      () => {
        setLocState("error");
        setLocationAddress("Location permission not granted yet");
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  };

  const handleCallAmbulance = async () => {
    const confirmed = window.confirm("Call ambulance (108) now?");
    if (!confirmed) return;

    setCallingAmbulance(true);
    window.navigator.vibrate?.([120, 60, 120]);

    try {
      if (location) {
        await logAmbulanceCall({
          location,
          address: locationAddress,
          contactName: user?.emergencyContact?.name || user?.name || "",
          contactPhone: user?.emergencyContact?.phone || "",
        });
      }

      setActive(true);
      setCallStartedAt(Date.now());
      setElapsedMs(0);

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          window.location.href = "tel:108";
        }, 150);
      }
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to log ambulance call");
    } finally {
      setCallingAmbulance(false);
    }
  };

  const handleCallCaregiver = () => {
    const phone = user?.emergencyContact?.phone;
    if (!phone) {
      alert("No caregiver phone number is set.");
      return;
    }

    window.location.href = `tel:${phone}`;
  };

  const handleShareLocation = async () => {
    const shareText = locationAddress
      ? `Emergency location: ${locationAddress}`
      : "Emergency location captured by SwiftPharma.";

    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      alert("Unable to copy location right now.");
    }
  };

  const handleAskCompanion = () => {
    openWithMessage(
      `I have an emergency. Current status: ${phaseText}. Location: ${locationAddress || "not captured yet"}. Give short, safe next steps.`,
    );
  };

  const handleCancelEmergency = () => {
    setActive(false);
    setPhaseIndex(0);
    setPhaseReveal(0);
    setPhaseText("CALL AMBULANCE (108)");
    setElapsedMs(0);
    setCallStartedAt(null);
    setAgentPosition(null);
  };

  const toggleMedicine = (name) => {
    setSelectedMedicines((prev) => {
      const exists = prev.some((item) => item.name === name);
      if (exists) return prev.filter((item) => item.name !== name);
      return [...prev, { name, quantity: "1" }];
    });
  };

  const addCustomMedicine = () => {
    const name = customMedicine.trim();
    const quantity = customQuantity.trim() || "1";
    if (!name) return;

    setSelectedMedicines((prev) => {
      if (prev.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        return prev;
      }
      return [...prev, { name, quantity }];
    });

    setCustomMedicine("");
    setCustomQuantity("1");
  };

  const activateMedicineSOS = async () => {
    if (!location) {
      alert("Location is required for medicine SOS relay.");
      return;
    }

    if (!selectedMedicines.length) {
      alert("Please select at least one medicine.");
      return;
    }

    setRelaySubmitting(true);
    try {
      const { data } = await createRelay({
        medicines: selectedMedicines,
        location,
        emergencyContactName: user?.emergencyContact?.name || user?.name || "",
        emergencyContactPhone: user?.emergencyContact?.phone || "",
      });

      setMedicineRelayState(data?.relay?.status || "broadcasting");
      alert("Emergency medicine SOS activated. Nearby pharmacies are being alerted.");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to activate medicine SOS relay.");
    } finally {
      setRelaySubmitting(false);
    }
  };

  const applySuggestedMedicines = () => {
    const suggested = Array.isArray(triageResult?.suggestedMedicines)
      ? triageResult.suggestedMedicines
      : [];

    if (!suggested.length) return;

    setSelectedMedicines((prev) => {
      const next = [...prev];
      for (const raw of suggested) {
        const name = String(raw || "").trim();
        if (!name) continue;
        if (next.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
          continue;
        }
        next.push({ name, quantity: "1" });
      }
      return next;
    });
  };

  const runAITriage = async () => {
    const symptoms = triageInput.trim();
    if (!symptoms) {
      alert("Please describe symptoms for AI advice.");
      return;
    }

    setTriageLoading(true);
    try {
      const { data } = await triageSymptoms({ symptoms });
      setTriageResult(data || null);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to get AI medicine advice.");
    } finally {
      setTriageLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07101f] font-nexus-bold text-slate-100">
      <Navbar />
      <main className="relative isolate overflow-hidden pb-12 pt-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#07101f_0%,#081123_100%)]" />
        {active ? <div className="pointer-events-none absolute inset-0 sos-emergency-overlay" /> : null}

        <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/90 shadow-[0_30px_100px_rgba(0,0,0,0.48)]">
            <div className="flex flex-col gap-3 border-b border-white/10 bg-gradient-to-r from-[#dc2626] via-[#c2410c] to-[#7f1d1d] px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-red-50/80">
                  Emergency status
                </p>
                <h1 className="text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
                  {active ? currentPhase.title : "CALL AMBULANCE (108)"}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em]">
                <span className="rounded-full bg-white/15 px-3 py-2 text-white">
                  {active ? `Elapsed ${formatElapsed(elapsedMs)}` : "Ready now"}
                </span>
                <span className="rounded-full bg-black/20 px-3 py-2 text-white">
                  {etaText}
                </span>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)]">
              <div className="space-y-6 p-5 sm:p-7 lg:p-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.36em] text-red-300/90">
                    Urgent minimal response
                  </p>
                  <h2 className="max-w-3xl text-3xl font-black uppercase leading-none text-white sm:text-5xl">
                    {phaseText.slice(0, phaseReveal) || phaseText}
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    {active
                      ? currentPhase.detail
                      : "One tap starts the emergency call, captures location, and shows a live response status."}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
                    {active ? (
                      <div className="space-y-4">
                        <div className="relative mx-auto flex min-h-[260px] items-center justify-center overflow-hidden rounded-[24px] border border-red-500/20 bg-slate-950/80">
                          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(220,38,38,0.16),transparent_58%)]" />
                          <div className="sos-radar-stage absolute inset-0">
                            <span className="sos-radar-ring sos-radar-ring-one" />
                            <span className="sos-radar-ring sos-radar-ring-two" />
                            <span className="sos-radar-ring sos-radar-ring-three" />
                          </div>
                          <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-red-400/30 bg-red-500/15 text-red-300 shadow-[0_0_0_12px_rgba(220,38,38,0.08)]">
                              <Ambulance className="size-11" strokeWidth={2.3} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-black uppercase tracking-[0.28em] text-red-100/75">
                                {statusNote}
                              </p>
                              <p className="text-lg font-black text-white sm:text-xl">
                                {phaseText}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            <span>Dispatch progress</span>
                            <span>{Math.round(((phaseIndex + 1) / EMERGENCY_PHASES.length) * 100)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 transition-all duration-500"
                              style={{ width: `${((phaseIndex + 1) / EMERGENCY_PHASES.length) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <Button variant="outline" className="min-h-12 !border-red-400 !text-red-200" onClick={handleCancelEmergency}>
                            <span className="inline-flex items-center gap-2">
                              <X className="size-4" />
                              Cancel Emergency
                            </span>
                          </Button>
                          <Button variant="primary" className="min-h-12 !bg-emerald-500 !text-white hover:!bg-emerald-400" onClick={handleCallCaregiver}>
                            <span className="inline-flex items-center gap-2">
                              <PhoneCall className="size-4" />
                              Call Caregiver
                            </span>
                          </Button>
                          <Button variant="secondary" className="min-h-12" onClick={handleShareLocation}>
                            <span className="inline-flex items-center gap-2">
                              {shareCopied ? <Copy className="size-4" /> : <Share2 className="size-4" />}
                              {shareCopied ? "Location copied" : "Share Location"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-5 py-6 text-center sm:py-8">
                        <div className="text-xs font-black uppercase tracking-[0.28em] text-red-200/80">
                          Phase 1
                        </div>
                        <button
                          type="button"
                          onClick={handleCallAmbulance}
                          disabled={callingAmbulance}
                          className="inline-flex min-h-[88px] w-full items-center justify-center gap-3 rounded-[28px] bg-gradient-to-r from-[#dc2626] via-[#ef4444] to-[#f97316] px-6 text-base font-black text-white shadow-[0_20px_50px_rgba(220,38,38,0.4)] transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-80 sm:min-h-[102px] sm:text-xl"
                        >
                          <Ambulance className="size-8 sm:size-9" strokeWidth={2.2} />
                          <span>
                            {callingAmbulance ? "Calling Ambulance..." : "Call Ambulance (108)"}
                          </span>
                        </button>
                        <p className="max-w-md text-sm leading-6 text-slate-300">
                          Press once. Your location is captured and the emergency log is sent right away.
                        </p>
                        <Button variant="outline" onClick={handleAskCompanion}>
                          Ask health companion for guidance
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-red-200">
                      <Pill className="size-4" />
                      <p className="text-xs font-black uppercase tracking-[0.2em]">
                        Emergency Medicine SOS
                      </p>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Add urgent medicines and dispatch a pharmacy relay from the same emergency screen.
                    </p>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/65 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        AI symptom advisor
                      </p>
                      <textarea
                        rows={3}
                        value={triageInput}
                        onChange={(e) => setTriageInput(e.target.value)}
                        placeholder="Describe your problem, symptoms, duration, and severity"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={runAITriage} disabled={triageLoading}>
                          {triageLoading ? "Analyzing..." : "AI Suggest Medicines"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            openWithMessage(
                              `Emergency symptom help needed. Symptoms: ${triageInput || "not provided"}. Give immediate safe medicine guidance and precautions.`,
                            )
                          }
                        >
                          Ask Health Companion
                        </Button>
                        {Array.isArray(triageResult?.suggestedMedicines) && triageResult.suggestedMedicines.length ? (
                          <Button variant="primary" onClick={applySuggestedMedicines}>
                            Add Suggested Medicines
                          </Button>
                        ) : null}
                      </div>

                      {triageResult?.disclaimer ? (
                        <p className="mt-2 text-xs text-slate-400">{triageResult.disclaimer}</p>
                      ) : null}

                      {triageResult?.callAmbulance ? (
                        <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200">
                          AI alert: ambulance recommended due to critical symptoms.
                        </p>
                      ) : null}

                      {Array.isArray(triageResult?.suggestedMedicines) && triageResult.suggestedMedicines.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {triageResult.suggestedMedicines.map((med) => (
                            <span
                              key={`ai-${med}`}
                              className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-200"
                            >
                              {med}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {EMERGENCY_MEDICINES.map((name) => {
                        const picked = selectedMedicines.some((item) => item.name === name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => toggleMedicine(name)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              picked
                                ? "border-red-400 bg-red-500 text-white"
                                : "border-white/15 bg-slate-950 text-slate-300"
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_110px_64px]">
                      <input
                        value={customMedicine}
                        onChange={(e) => setCustomMedicine(e.target.value)}
                        placeholder="Custom medicine"
                        className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                      />
                      <input
                        value={customQuantity}
                        onChange={(e) => setCustomQuantity(e.target.value)}
                        placeholder="Qty"
                        className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={addCustomMedicine}
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
                      >
                        Add
                      </button>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Selected medicines
                      </p>
                      {selectedMedicines.length ? (
                        <ul className="mt-2 space-y-1 text-sm text-slate-200">
                          {selectedMedicines.map((item) => (
                            <li key={`${item.name}-${item.quantity}`} className="flex items-center justify-between gap-2">
                              <span>{item.name}</span>
                              <span className="text-slate-400">x {item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">No medicines selected yet.</p>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <Button
                        variant="primary"
                        className="w-full !bg-red-600 hover:!bg-red-500"
                        onClick={activateMedicineSOS}
                        disabled={relaySubmitting || !selectedMedicines.length || locState !== "ready"}
                      >
                        {relaySubmitting ? "Activating Medicine SOS..." : "Activate Medicine SOS Relay"}
                      </Button>
                      <p className="text-xs text-slate-400">
                        {medicineRelayState
                          ? `Relay status: ${medicineRelayState}`
                          : "Relay starts once location is ready and at least one medicine is selected."}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 self-start rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Live status
                      </p>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-200/70">
                          {active ? "Current phase" : "Standby"}
                        </p>
                        <p className="mt-2 text-lg font-black leading-tight text-white">
                          {active ? currentPhase.title : "Ready to call"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {active
                            ? currentPhase.detail
                            : "Emergency response will animate here instantly after confirmation."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span>Timeline</span>
                        <span>{active ? "Live" : "Idle"}</span>
                      </div>
                      <div className="grid gap-2">
                        {EMERGENCY_PHASES.map((phase, index) => {
                          const isCurrent = index <= phaseIndex;
                          return (
                            <div
                              key={phase.title}
                              className={`rounded-2xl border px-3 py-3 transition ${
                                isCurrent
                                  ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-100"
                                  : "border-white/10 bg-white/5 text-slate-400"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`mt-0.5 flex size-6 items-center justify-center rounded-full text-[10px] font-black ${
                                    isCurrent ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-400"
                                  }`}
                                >
                                  {isCurrent ? <CheckCircle2 className="size-3.5" /> : index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-black uppercase tracking-[0.14em]">
                                    {phase.title}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-inherit opacity-80">
                                    {phase.detail}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 bg-slate-950/60 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                          Live location map
                        </p>
                        <p className="text-sm font-semibold text-white">
                          {locationAddress || "Waiting for location"}
                        </p>
                      </div>
                      <div className="rounded-full border border-emerald-400/20 bg-emerald-500/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                        You are here
                      </div>
                    </div>

                    <div className="relative">
                      <MapContainer center={center} zoom={14} style={{ height: "340px", width: "100%" }}>
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <CircleMarker
                          center={center}
                          radius={12}
                          pathOptions={{
                            color: "#10b981",
                            fillColor: "#10b981",
                            fillOpacity: 0.9,
                          }}
                        >
                          <Popup>You are here</Popup>
                        </CircleMarker>
                        <Marker position={center} icon={createPulseIcon()}>
                          <Popup>You are here</Popup>
                        </Marker>
                        {agentPosition ? (
                          <Marker position={[agentPosition.lat, agentPosition.lng]} icon={createAmbulanceIcon()}>
                            <Popup>Ambulance assigned</Popup>
                          </Marker>
                        ) : null}
                      </MapContainer>

                      {active ? (
                        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Estimated arrival
                              </p>
                              <p className="text-xl font-black text-white">
                                {etaText}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-2 text-emerald-300">
                              <HeartPulse className="size-4 animate-pulse" />
                              <span className="text-[11px] font-black uppercase tracking-[0.18em]">
                                Ambulance moving
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-3 text-slate-300">
                        <Clock3 className="size-4 text-red-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                          Timer
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-black text-white">
                        {formatElapsed(elapsedMs)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-3 text-slate-300">
                        <MapPin className="size-4 text-red-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                          Location
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-white">
                        {locationAddress || "Location will appear here"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Button variant="outline" className="min-h-12 !border-red-400 !text-red-200" onClick={handleCancelEmergency}>
                      <span className="inline-flex items-center gap-2">
                        <X className="size-4" />
                        Cancel Emergency
                      </span>
                    </Button>
                    <Button variant="primary" className="min-h-12 !bg-emerald-500 !text-white hover:!bg-emerald-400" onClick={handleCallCaregiver}>
                      <span className="inline-flex items-center gap-2">
                        <PhoneCall className="size-4" />
                        Call Caregiver
                      </span>
                    </Button>
                    <Button variant="secondary" className="min-h-12" onClick={handleShareLocation}>
                      <span className="inline-flex items-center gap-2">
                        {shareCopied ? <Copy className="size-4" /> : <Share2 className="size-4" />}
                        {shareCopied ? "Location copied" : "Share Location"}
                      </span>
                    </Button>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                    {active
                      ? "Keep the phone on speaker if safe. Help is in motion."
                      : "Tap the red button to start the emergency animation, capture location, and notify your caregiver."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SOSPage;
