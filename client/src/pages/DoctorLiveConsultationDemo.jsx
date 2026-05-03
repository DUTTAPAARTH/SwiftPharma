import React, { useEffect, useMemo, useState } from "react";

const doctor = {
  name: "Dr. Sharma",
  specialization: "General Physician",
  experience: "8+ years",
  rating: "4.8",
  avatar:
    "https://images.unsplash.com/photo-1612277795421-9bc7706a4a41?auto=format&fit=crop&w=300&q=80",
  video:
    "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=1400&q=80",
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const StateBadge = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
    <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-sm font-semibold text-slate-700">{value}</p>
  </div>
);

const DoctorLiveConsultationDemo = () => {
  const [callState, setCallState] = useState("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(1);

  useEffect(() => {
    if (callState !== "calling") return undefined;

    const timeoutId = setTimeout(() => {
      setCallState("in-call");
      setElapsedSeconds(1);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [callState]);

  useEffect(() => {
    if (callState !== "in-call") return undefined;

    const intervalId = setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [callState]);

  const callButtonLabel = useMemo(() => {
    if (callState === "calling") return "Connecting...";
    if (callState === "in-call") return "Consultation In Progress";
    if (callState === "ended") return "Start New Consultation";
    return "Start Video Call";
  }, [callState]);

  const handleStartCall = () => {
    setIsMuted(false);
    setIsCameraOn(true);
    setElapsedSeconds(1);
    setCallState("calling");
  };

  const handleEndCall = () => {
    setCallState("ended");
  };

  const handleDownloadPrescription = () => {
    window.alert("Prescription download started (demo)");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-[0_25px_60px_rgba(14,116,144,0.12)] backdrop-blur sm:p-8">
          <header className="text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
              Live Doctor Consultation
            </h1>
            <p className="mt-2 text-base text-slate-600 sm:text-lg">
              Connect instantly with certified doctors
            </p>
          </header>

          <section className="mt-7 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-sky-50 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={doctor.avatar}
                  alt={doctor.name}
                  className="h-20 w-20 rounded-2xl object-cover shadow-md ring-4 ring-sky-100"
                />
                <div>
                  <p className="text-xl font-semibold text-slate-800">{doctor.name}</p>
                  <p className="text-sm text-sky-700">{doctor.specialization}</p>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                <StateBadge label="Experience" value={doctor.experience} />
                <StateBadge label="Rating" value={`⭐ ${doctor.rating}`} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartCall}
              disabled={callState === "calling" || callState === "in-call"}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-4 text-base font-semibold text-white shadow-[0_12px_30px_rgba(2,132,199,0.4)] transition hover:-translate-y-0.5 hover:from-sky-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {callButtonLabel}
            </button>
          </section>
        </div>
      </div>

      {callState === "calling" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 transition-opacity duration-300">
          <div className="w-full max-w-md rounded-3xl border border-sky-300/30 bg-slate-900/90 p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-sky-500/15 ring-4 ring-sky-400/20">
              <img
                src={doctor.avatar}
                alt={doctor.name}
                className="h-20 w-20 rounded-full object-cover"
              />
            </div>

            <div className="mt-5 flex justify-center">
              <span className="inline-flex h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_22px_rgba(56,189,248,1)] animate-ping" />
            </div>

            <p className="mt-5 text-xl font-semibold text-white">Connecting to Doctor...</p>
            <p className="mt-2 text-slate-300">{doctor.name}</p>
          </div>
        </div>
      ) : null}

      {callState === "in-call" ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white transition-all duration-300">
          <div className="relative flex-1 overflow-hidden">
            <img
              src={doctor.video}
              alt="Doctor live video"
              className="h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/20" />

            <div className="absolute left-4 top-4 rounded-xl bg-slate-900/70 px-4 py-2 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Consultation Time</p>
              <p className="text-lg font-semibold text-emerald-300">{formatTime(elapsedSeconds)}</p>
            </div>

            <div className="absolute bottom-6 right-6 w-36 overflow-hidden rounded-2xl border border-white/20 bg-slate-900/60 shadow-xl backdrop-blur sm:w-44">
              <img
                src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&q=80"
                alt="Your preview"
                className="h-24 w-full object-cover sm:h-28"
              />
              <p className="px-2 py-1 text-xs text-slate-200">You</p>
            </div>
          </div>

          <div className="border-t border-white/10 bg-slate-900/90 px-4 py-5 backdrop-blur sm:px-6">
            <div className="mx-auto flex max-w-md items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setIsMuted((previous) => !previous)}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full border text-lg shadow-md transition ${
                  isMuted
                    ? "border-rose-300 bg-rose-500/20 text-rose-100"
                    : "border-slate-500 bg-slate-700/70 text-white hover:bg-slate-600"
                }`}
                aria-label="Toggle mute"
              >
                {isMuted ? "🔇" : "🎤"}
              </button>

              <button
                type="button"
                onClick={() => setIsCameraOn((previous) => !previous)}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full border text-lg shadow-md transition ${
                  isCameraOn
                    ? "border-slate-500 bg-slate-700/70 text-white hover:bg-slate-600"
                    : "border-amber-300 bg-amber-500/20 text-amber-100"
                }`}
                aria-label="Toggle camera"
              >
                {isCameraOn ? "📹" : "📷"}
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-rose-300 bg-rose-600 text-lg text-white shadow-lg transition hover:bg-rose-700"
                aria-label="End call"
              >
                ❌
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {callState === "ended" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-white p-7 shadow-[0_30px_80px_rgba(15,23,42,0.4)] sm:p-8">
            <h2 className="text-2xl font-bold text-slate-800">Consultation Completed</h2>
            <p className="mt-2 text-slate-600">
              Your follow-up guidance and suggested medicines are ready.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Prescription</p>
              <ul className="mt-3 space-y-2 text-slate-700">
                <li className="rounded-lg bg-white px-3 py-2 shadow-sm">Medicine 1: Paracetamol</li>
                <li className="rounded-lg bg-white px-3 py-2 shadow-sm">Medicine 2: Vitamin C</li>
              </ul>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleDownloadPrescription}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-emerald-700"
              >
                Download Prescription
              </button>
              <button
                type="button"
                onClick={() => setCallState("idle")}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default DoctorLiveConsultationDemo;
