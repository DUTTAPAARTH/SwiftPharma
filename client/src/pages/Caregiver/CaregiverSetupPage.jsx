import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import * as caregiverService from "../../services/caregiverService.js";
import { getMyReminders } from "../../services/reminderService.js";

const CaregiverSetupPage = () => {
  const navigate = useNavigate();
  const [activeLink, setActiveLink] = useState(null);
  const [criticalReminders, setCriticalReminders] = useState([]);
  const [formData, setFormData] = useState({
    caregiverName: "",
    caregiverPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: linkData } = await caregiverService.getMyCaregiver();
        if (linkData?.caregiver) {
          setActiveLink(linkData.caregiver);
        }

        const { data: remindersData } = await getMyReminders();
        const critical = (
          Array.isArray(remindersData?.reminders) ? remindersData.reminders : []
        ).filter((r) => r.isCritical);
        setCriticalReminders(critical);
      } catch (error) {
        console.error("Failed to load caregiver data", error);
      }
    };
    loadData();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!formData.caregiverName.trim() || !formData.caregiverPhone.trim()) {
      setMessage({ type: "error", text: "All fields required" });
      return;
    }

    setLoading(true);
    try {
      const { data } = await caregiverService.inviteCaregiver(formData);
      setActiveLink({ ...data, status: "pending" });
      const inviteUrl = `${window.location.origin}/caregiver/accept/${data.inviteToken}`;
      setMessage({
        type: "success",
        text: `Invite sent! Share this link: ${inviteUrl}`,
      });
      setFormData({ caregiverName: "", caregiverPhone: "" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to send invite",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm("Revoke caregiver access?")) return;
    try {
      await caregiverService.revokeCaregiver(activeLink._id);
      setActiveLink(null);
      setMessage({ type: "success", text: "Caregiver access revoked" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to revoke access" });
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-6 lg:px-12 pt-32 pb-24">
        <div className="mb-8">
          <h1 className="text-5xl font-black text-slate-900 dark:text-white">
            Caregiver Settings
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Manage who receives alerts when you miss critical doses
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Left Panel */}
          <section className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-100 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {activeLink ? "Your Caregiver" : "Add an Emergency Caregiver"}
            </h2>

            {activeLink ? (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Name
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    {activeLink.caregiverName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Phone
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    {activeLink.caregiverPhone}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Status
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-success/20 text-success">
                    <span className="size-2 rounded-full bg-success"></span>
                    {activeLink.status === "active" ? "Active" : "Pending"}
                  </div>
                </div>
                <button
                  onClick={handleRevoke}
                  className="mt-6 w-full px-4 py-3 rounded-2xl bg-danger text-white font-black text-sm hover:bg-danger-dark transition-colors"
                >
                  Revoke Access
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="mt-6 space-y-4">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Caregiver Name
                  </span>
                  <input
                    type="text"
                    value={formData.caregiverName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        caregiverName: e.target.value,
                      })
                    }
                    placeholder="e.g., Mom"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Phone (10 digits, starting with 6-9)
                  </span>
                  <input
                    type="tel"
                    value={formData.caregiverPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        caregiverPhone: e.target.value,
                      })
                    }
                    placeholder="9876543210"
                    maxLength="10"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-2xl bg-primary text-white font-black text-sm hover:bg-primary-dark disabled:opacity-50 transition-colors"
                >
                  {loading ? "Sending..." : "Send Invite"}
                </button>
              </form>
            )}

            {message && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm ${
                  message.type === "error"
                    ? "bg-danger/10 text-danger"
                    : "bg-success/10 text-success"
                }`}
              >
                {message.text}
              </div>
            )}
          </section>

          {/* Right Panel */}
          <section className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-100 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              My Critical Reminders
            </h2>

            {criticalReminders.length > 0 ? (
              <div className="mt-6 space-y-3">
                {criticalReminders.map((r) => (
                  <div
                    key={r._id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-red-200 dark:border-red-900/30"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">
                      {r.medicineName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {(r.times || []).join(", ")} • Escalate in{" "}
                      {r.escalationWindowMinutes} mins
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-slate-500 dark:text-slate-400">
                No critical reminders set yet. Mark a reminder as critical from
                the Reminders page.
              </p>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CaregiverSetupPage;
