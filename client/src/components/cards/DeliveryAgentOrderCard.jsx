import React from "react";

const DeliveryAgentOrderCard = ({ orderId, address, status }) => (
  <div className="bg-white border border-tealLight p-4 rounded-lg shadow-sm">
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-semibold text-darkGraphite">Order #{orderId}</h4>
      <span className="text-xs bg-darkGraphite text-brown px-2 py-1 rounded">
        {status}
      </span>
    </div>
    <p className="text-sm text-darkGraphite/80">{address}</p>
    <div className="mt-3 flex gap-2">
      <button className="bg-orangeCTA text-brown px-3 py-2 rounded">
        Picked Up
      </button>
      <button className="bg-tealPrimary text-brown px-3 py-2 rounded">
        Delivered
      </button>
    </div>
  </div>
);

export default DeliveryAgentOrderCard;
