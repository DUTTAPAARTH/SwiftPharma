import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import * as caregiverService from "../../services/caregiverService.js";
import { useEmergencySocket } from "../../hooks/useEmergencySocket";

const AdherenceRing = ({ value }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 75 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex size-32 items-center justify-center">
      <svg viewBox="0 0 110 110" className="size-full -rotate-90">
        <circle
          cx="55"
          cy="55"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="55"
          cy="55"
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-2xl font-black text-slate-900 dark:text-white">
          {Math.round(value)}%
        </p>
      </div>
    </div>
  );
};

const MiniBarChart = ({ data = [] }) => {
  const max = Math.max(...data.map((d) => d.taken + d.missed + d.skipped), 1);

  return (
    <div className="flex gap-1 h-12 items-end">
      {data.map((day, i) => {
        const total = day.taken + day.missed + day.skipped;
        const takenPercent = total > 0 ? (day.taken / total) * 100 : 0;
        const missedPercent = total > 0 ? (day.missed / total) * 100 : 0;

        return (
          <div key={i} className="flex-1 flex flex-col gap-px justify-end">
            <div
              className="w-full rounded-t-sm"
              style={{
                backgroundColor:
                  takenPercent === 100
                    ? "#22c55e"
                    : takenPercent > 0
                      ? "#f59e0b"
                      : "#e5e7eb",
                height: `${(takenPercent / 100) * 100}%`,
              }}
            />
            {missedPercent > 0 && (
              <div
                className="w-full"
                style={{
                  backgroundColor: "#ef4444",
                  height: `${(missedPercent / 100) * 100}%`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const CaregiverDashboardPage = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEmergencySocket({
    onPrescriptionUpdate: () => {
      setRefreshTick((value) => value + 1);
    },
    onAmbulanceCalled: (payload) => {
      setRefreshTick((value) => value + 1);
      toast.error(
        `${payload?.log?.patientName || "A patient"} called an ambulance`,
      );
    },
  });

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const { data } = await caregiverService.getMyPatients();
        setPatients(Array.isArray(data?.patients) ? data.patients : []);
      } catch (error) {
        console.error("Failed to load patients", error);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };
    loadPatients();
  }, [refreshTick]);

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

  if (!patients.length) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Navbar />
        <main className="max-w-[1440px] mx-auto px-6 lg:px-12 pt-32 pb-24 text-center">
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            ❤️
          </p>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            You are not linked as a caregiver for any patients yet
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Ask the patient to send you an invite link from their SwiftPharma
            app
          </p>
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
          My Patients
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Monitor adherence for patients you care for
        </p>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {patients.map((patient) => (
            <PatientCard key={patient.patientId} patient={patient} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const PatientCard = ({ patient }) => {
  const navigate = useNavigate();
  const [adherence, setAdherence] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await caregiverService.getPatientAdherence(
          patient.patientId,
        );
        setAdherence(data);
      } catch (error) {
        console.error("Failed to load adherence", error);
      }
    };
    load();
  }, [patient.patientId]);

  if (!adherence) return null;

  return (
    <button
      onClick={() => navigate(`/caregiver/patients/${patient.patientId}`)}
      className="bg-white dark:bg-slate-900 rounded-[40px] p-6 border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-shadow text-left"
    >
      <h3 className="text-lg font-black text-slate-900 dark:text-white">
        {patient.displayName}
      </h3>

      <div className="mt-6 flex items-center gap-6">
        <AdherenceRing value={adherence.adherencePercent} />
        <div className="space-y-4 flex-1">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Streak
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              🔥 {adherence.streakDays} days
            </p>
          </div>
          {adherence.last7Days && adherence.last7Days.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Last 7 Days
              </p>
              <div className="mt-2">
                <MiniBarChart data={adherence.last7Days} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-xs font-bold text-primary">View details →</div>
    </button>
  );
};

export default CaregiverDashboardPage;
