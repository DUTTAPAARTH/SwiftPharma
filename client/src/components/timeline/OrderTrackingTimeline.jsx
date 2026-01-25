import React from "react";

const steps = ["Placed", "Approved", "Packed", "Out for Delivery", "Delivered"];

const OrderTrackingTimeline = ({ currentStep = 0 }) => (
  <div className="flex flex-col gap-2">
    {steps.map((step, index) => (
      <div key={step} className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            index <= currentStep
              ? "bg-tealPrimary"
              : "bg-tealLight border border-tealPrimary"
          }`}
        />
        <span
          className={`text-sm ${
            index <= currentStep ? "text-darkGraphite" : "text-darkGraphite/60"
          }`}
        >
          {step}
        </span>
      </div>
    ))}
  </div>
);

export default OrderTrackingTimeline;
