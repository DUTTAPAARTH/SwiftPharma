import React from "react";

const AddressSelector = () => (
  <div className="bg-white p-4 rounded-lg shadow border border-tealLight">
    <p className="font-semibold text-darkGraphite mb-2">Delivery Address</p>
    <select className="w-full border border-tealLight rounded px-3 py-2">
      <option>Home</option>
      <option>Office</option>
    </select>
  </div>
);

export default AddressSelector;
