import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import * as caregiverService from "../../services/caregiverService.js";
import { useEmergencySocket } from "../../hooks/useEmergencySocket";

const PatientDetailPage = () => {
  const { patientId } = useParams();
  const [adherence, setAdherence] = useState(null);
  const [alerts, setAlerts] = useState([]);
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
    const load = async () => {
      try {
        const { data: adhData } =
          await caregiverService.getPatientAdherence(patientId);
        setAdherence(adhData);

        const { data: alertsData } = await caregiverService.getPendingAlerts();
        const patientAlerts = (alertsData?.alerts || []).filter(
          (a) => String(a.patientId?._id || a.patientId) === String(patientId),
        );
        setAlerts(patientAlerts);
      } catch (error) {
        console.error("Failed to load patient detail", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId, refreshTick]);

  if (loading || !adherence) {
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
          Adherence Details
        </h1>

        <div className="mt-12 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-100 dark:border-slate-800">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                This Month
              </h2>
              <div className="mt-6 grid md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Adherence
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                    {adherence.adherencePercent}%
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Streak
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                    🔥 {adherence.streakDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Taken
                  </p>
                  <p className="mt-2 text-3xl font-black text-success">
                    {adherence.takenDoses}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Missed
                  </p>
                  <p className="mt-2 text-3xl font-black text-danger">
                    {adherence.missedDoses}
                  </p>
                </div>
              </div>
            </div>

            {/* Last 7 Days Table */}
            {adherence.last7Days && adherence.last7Days.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Last 7 Days Breakdown
                </h3>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="py-3 font-black text-slate-900 dark:text-white">
                          Date
                        </th>
                        <th className="py-3 font-bold text-slate-500">Taken</th>
                        <th className="py-3 font-bold text-slate-500">
                          Missed
                        </th>
                        <th className="py-3 font-bold text-slate-500">
                          Skipped
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {adherence.last7Days.map((day) => (
                        <tr
                          key={day.date}
                          className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <td className="py-3 font-semibold text-slate-900 dark:text-white">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="size-2 rounded-full bg-success"></span>
                              {day.taken}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="size-2 rounded-full bg-danger"></span>
                              {day.missed}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500">{day.skipped}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Pending Alerts Sidebar */}
          {alerts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-100 dark:border-slate-800 h-fit">
              <h3 className="text-xl font-black text-danger">
                ⚠️ Needs Attention
              </h3>
              <div className="mt-6 space-y-4">
                {alerts.map((alert) => (
                  <AlertCard key={alert._id} alert={alert} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const AlertCard = ({ alert }) => {
  const [responding, setResponding] = useState(false);

  const handleRespond = async (response) => {
    setResponding(true);
    try {
      await caregiverService.respondToAlert(alert._id, response);
      alert("Response recorded");
    } catch (error) {
      alert("Failed to respond");
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20">
      <p className="font-bold text-slate-900 dark:text-white">
        {alert.medicineName}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        {new Date(alert.scheduledAt).toLocaleTimeString()}
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => handleRespond("ok")}
          disabled={responding}
          className="flex-1 px-2 py-1 text-xs font-bold rounded bg-success text-white hover:bg-success-dark disabled:opacity-50"
        >
          Okay
        </button>
        <button
          onClick={() => handleRespond("need_help")}
          disabled={responding}
          className="flex-1 px-2 py-1 text-xs font-bold rounded bg-danger text-white hover:bg-danger-dark disabled:opacity-50"
        >
          Help
        </button>
      </div>
    </div>
  );
};

export default PatientDetailPage;
