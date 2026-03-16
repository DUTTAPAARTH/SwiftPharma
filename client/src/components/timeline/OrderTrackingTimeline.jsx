const OrderTrackingTimeline = ({ currentStep = 0 }) => {
  const steps = [
    { label: "Injection", icon: "order_approve", desc: "Placed" },
    { label: "Verification", icon: "verified_user", desc: "Approved" },
    { label: "Sterile Prep", icon: "inventory", desc: "Packed" },
    { label: "Transit", icon: "local_shipping", desc: "Dispatch" },
    { label: "Fulfillment", icon: "task_alt", desc: "Delivered" },
  ];

  return (
    <div className="relative pt-8 pb-4">
      {/* Connector Line */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 -translate-y-[22px] rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(37,99,235,0.4)]"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        ></div>
      </div>

      {/* Steps */}
      <div className="relative z-10 flex justify-between gap-2">
        {steps.map((step, index) => {
          const isActive = index <= currentStep;
          const isPulse =
            index === currentStep && currentStep < steps.length - 1;

          return (
            <div
              key={index}
              className="flex flex-col items-center gap-4 group cursor-default max-w-[100px] text-center"
            >
              <div
                className={`size-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                  isActive
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300"
                } ${isPulse ? "animate-pulse" : ""}`}
              >
                <span className="material-symbols-outlined text-xl font-black">
                  {step.icon}
                </span>
              </div>

              <div className="space-y-1">
                <p
                  className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-500 ${isActive ? "text-slate-900 dark:text-white" : "text-slate-400"}`}
                >
                  {step.label}
                </p>
                <p
                  className={`text-[8px] font-bold uppercase tracking-tighter transition-colors duration-500 ${isActive ? "text-primary/70" : "text-slate-300 dark:text-slate-600"}`}
                >
                  {step.desc}
                </p>
              </div>

              {isActive && index < currentStep && (
                <div className="absolute top-1/2 -translate-y-[22px] -ml-[50%] w-full flex justify-center opacity-40">
                  <div className="size-1 rounded-full bg-white"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTrackingTimeline;
