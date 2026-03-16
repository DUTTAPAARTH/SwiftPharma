const Prescriptions = () => {
  const {
    prescriptions,
    loadPrescriptions,
    loading,
    error,
    upload,
    validate,
    reupload,
  } = usePrescription();
  const [filter, setFilter] = useState("all"); // all, valid, expired, pending
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const getStatusConfig = (prescription) => {
    const now = new Date();
    const expiry = new Date(prescription.expiryDate);
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (prescription.status === "awaiting_pharmacist") {
      return {
        label: "Awaiting Pharmacist Approval",
        icon: "pending_actions",
        color: "text-amber-500",
        bg: "bg-amber-50 dark:bg-amber-500/10",
        border: "border-amber-100",
        animate: "animate-pulse",
      };
    }

    if (prescription.status === "ai_rejected") {
      return {
        label: "Rejected by AI",
        icon: "warning",
        color: "text-red-500",
        bg: "bg-red-50 dark:bg-red-500/10",
        border: "border-red-100",
      };
    }

    if (prescription.status === "rejected") {
      return {
        label: "Rejected by Pharmacist",
        icon: "cancel",
        color: "text-red-500",
        bg: "bg-red-50 dark:bg-red-500/10",
        border: "border-red-100",
      };
    }
    if (prescription.status === "invalid") {
      return {
        label: "Invalid prescription",
        icon: "error",
        color: "text-slate-400",
        bg: "bg-slate-50 dark:bg-slate-500/10",
        border: "border-slate-100",
      };
    }
    if (prescription.status === "pending") {
      return {
        label: "Verification Pending",
        icon: "hourglass_top",
        color: "text-amber-500",
        bg: "bg-amber-50 dark:bg-amber-500/10",
        border: "border-amber-100",
        animate: "animate-pulse",
      };
    }
    if (expiry < now) {
      return {
        label: "Expired",
        icon: "history",
        color: "text-slate-500",
        bg: "bg-slate-100 dark:bg-slate-800",
        border: "border-slate-200",
      };
    }
    if (daysLeft <= 7) {
      return {
        label: "Expiring Soon",
        icon: "notification_important",
        color: "text-orange-500",
        bg: "bg-orange-50 dark:bg-orange-500/10",
        border: "border-orange-100",
      };
    }
    return {
      label: "Approved",
      icon: "verified_user",
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-500/10",
      border: "border-green-100",
    };
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (filter === "all") return true;
    if (filter === "valid") {
      return rx.status === "approved" && new Date(rx.expiryDate) > new Date();
    }
    if (filter === "expired") {
      return new Date(rx.expiryDate) < new Date();
    }
    if (filter === "pending") {
      return rx.status === "pending";
    }
    return true;
  });

  const handleDownload = (imageUrl) => {
    window.open(imageUrl, "_blank");
  };

  const handleReupload = (prescription) => {
    setSelectedPrescription(prescription);
    setShowUpload(true);
  };

  const handleUploadSubmit = async (formData) => {
    const result = selectedPrescription
      ? await reupload(selectedPrescription._id, formData)
      : await upload(formData);
    await loadPrescriptions();
    setShowUpload(false);
    setSelectedPrescription(null);
    return result;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 pt-32 space-y-12">
          <div className="h-64 rounded-[48px] bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
          <div className="grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-96 rounded-[48px] bg-slate-100 dark:bg-slate-800 animate-pulse"
              ></div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-32 pb-24 space-y-16">
        {/* Page Header */}
        <div className="relative overflow-hidden rounded-[60px] bg-slate-900 p-12 md:p-20 group">
          <div className="absolute top-0 right-0 p-20 opacity-10 group-hover:opacity-20 transition-all duration-700 rotate-12 group-hover:rotate-0">
            <span className="material-symbols-outlined text-[200px] font-black">
              prescriptions
            </span>
          </div>

          <div className="relative z-10 space-y-8 max-w-2xl">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase tracking-widest">
              <span className="size-2 rounded-full bg-primary animate-pulse"></span>{" "}
              Prescription center
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
              Your prescriptions
            </h1>
            <p className="text-xl text-slate-400 font-medium leading-relaxed">
              Upload prescriptions, track review status, and see expiry dates in
              one secure place.
            </p>

            <button
              onClick={() => setShowUpload(!showUpload)}
              className="h-16 px-10 rounded-full bg-primary text-white font-black text-[12px] uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-105 transition-all flex items-center gap-4"
            >
              <span className="material-symbols-outlined">
                {showUpload ? "close" : "add"}
              </span>
              {showUpload ? "Close upload" : "Upload prescription"}
            </button>
          </div>
        </div>

        {/* Upload Interface */}
        {showUpload && (
          <div className="animate-in fade-in slide-in-from-top-12 duration-500">
            <PrescriptionUpload
              onSubmit={handleUploadSubmit}
              onSuccess={() => setShowUpload(false)}
            />
          </div>
        )}

        {/* Filter System */}
        <div className="flex flex-wrap gap-4 items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap gap-3">
            {[
              { key: "all", label: "All Records", icon: "database" },
              { key: "valid", label: "Validated", icon: "check_circle" },
              {
                key: "pending",
                label: "Verification",
                icon: "hourglass_empty",
              },
              { key: "expired", label: "Archived", icon: "history" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`h-12 px-8 rounded-full font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 ${
                  filter === tab.key
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20"
                    : "bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 hover:border-primary/50"
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prescription Grid */}
        {filteredPrescriptions.length === 0 ? (
          <div className="py-32 text-center space-y-8 bg-white dark:bg-slate-900 rounded-[60px] border border-slate-100 dark:border-slate-800 shadow-soft">
            <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-800 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-600">
                inventory_2
              </span>
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                No prescriptions found
              </h3>
              <p className="text-slate-400 font-medium max-w-md mx-auto">
                Try a different filter or upload a prescription to get started.
              </p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="h-14 px-10 rounded-full border border-primary text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
            >
              Upload your first prescription
            </button>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrescriptions.map((rx) => {
              const cfg = getStatusConfig(rx);
              const expiry = new Date(rx.expiryDate);
              const isActuallyExpired = expiry < new Date();

              return (
                <div
                  key={rx._id}
                  className="bg-white dark:bg-slate-900 rounded-[48px] p-8 border border-slate-100 dark:border-slate-800 shadow-soft flex flex-col gap-8 group hover:border-primary/30 hover:shadow-2xl transition-all h-full"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`px-4 py-1.5 rounded-full ${cfg.bg} ${cfg.color} ${cfg.border} border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${cfg.animate || ""}`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {cfg.icon}
                      </span>
                      {cfg.label}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 tracking-tighter uppercase">
                      ID: {rx._id.slice(-8)}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-all group-hover:scale-110">
                        <span className="material-symbols-outlined text-primary font-black">
                          medical_services
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                          Dr. {rx.doctorName || "Unknown Identity"}
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Issued on:{" "}
                          {new Date(rx.issueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-6 rounded-[32px] border ${isActuallyExpired ? "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800" : "border-primary/10 bg-primary/5"} space-y-4`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Valid until</span>
                      <span
                        className={
                          isActuallyExpired ? "text-slate-500" : "text-primary"
                        }
                      >
                        {new Date(rx.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                    {rx.medicines && rx.medicines.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        {rx.medicines.slice(0, 2).map((med, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400"
                          >
                            <span className="material-symbols-outlined text-sm opacity-50">
                              pill
                            </span>
                            {med.name}
                          </div>
                        ))}
                        {rx.medicines.length > 2 && (
                          <p className="text-[10px] font-black text-primary uppercase ml-8">
                            +{rx.medicines.length - 2} more medicines
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleDownload(rx.images[0])}
                      className="h-14 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">
                        visibility
                      </span>{" "}
                      Inspect
                    </button>
                    {(rx.status === "rejected" || isActuallyExpired) && (
                      <button
                        onClick={() => handleReupload(rx)}
                        className="h-14 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm text-white">
                          upload
                        </span>{" "}
                        Re-upload
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            {
              label: "Total prescriptions",
              val: prescriptions.length,
              icon: "inventory",
              color: "text-primary",
            },
            {
              label: "Approved",
              val: prescriptions.filter(
                (rx) =>
                  rx.status === "approved" &&
                  new Date(rx.expiryDate) > new Date(),
              ).length,
              icon: "verified",
              color: "text-green-500",
            },
            {
              label: "Pending review",
              val: prescriptions.filter((rx) => rx.status === "pending").length,
              icon: "hourglass_top",
              color: "text-amber-500",
            },
            {
              label: "Expired",
              val: prescriptions.filter(
                (rx) => new Date(rx.expiryDate) < new Date(),
              ).length,
              icon: "auto_delete",
              color: "text-slate-400",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-soft flex flex-col items-center gap-4 text-center group hover:bg-slate-900 hover:text-white transition-all duration-500"
            >
              <span
                className={`material-symbols-outlined text-4xl ${stat.color} group-hover:text-white transition-all`}
              >
                {stat.icon}
              </span>
              <div className="space-y-1">
                <p className="text-4xl font-black tracking-tighter">
                  {stat.val}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-400">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Guidance */}
        <div className="rounded-[60px] bg-slate-50 dark:bg-slate-800 p-12 md:p-20 border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-all duration-700 scale-150">
            <span className="material-symbols-outlined text-[300px] font-black">
              gavel
            </span>
          </div>

          <div className="max-w-3xl space-y-12 relative z-10">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Prescription guidance
              </h2>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                What to expect after upload
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-12">
              {[
                {
                  icon: "schedule",
                  title: "Typical validity",
                  desc: "Most approved prescriptions remain valid for up to 180 days from the issue date.",
                },
                {
                  icon: "task_alt",
                  title: "Review window",
                  desc: "Prescription reviews are usually completed within 24 to 48 hours.",
                },
                {
                  icon: "security",
                  title: "Secure storage",
                  desc: "Prescription images and details are stored securely for future orders and verification.",
                },
                {
                  icon: "health_metrics",
                  title: "Rx-only medicines",
                  desc: "Prescription medicines stay locked until the uploaded prescription is reviewed and approved.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-6">
                  <div className="size-12 rounded-2xl bg-white dark:bg-slate-900 shadow-soft flex items-center justify-center border border-slate-100 dark:border-slate-700 flex-shrink-0">
                    <span className="material-symbols-outlined text-primary">
                      {item.icon}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      {item.title}
                    </h4>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Prescriptions;
