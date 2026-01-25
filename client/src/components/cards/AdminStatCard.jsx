import React from "react";

const AdminStatCard = ({ label, value }) => (
  <div className="card-lifted p-6 space-y-3 hover:shadow-lifted transition-all duration-300">
    <p className="text-slateGray text-sm font-medium">{label}</p>
    <h3 className="text-4xl font-bold bg-gradient-coral bg-clip-text text-transparent">
      {value}
    </h3>
    <div className="h-1 w-12 bg-electricOrange rounded-full"></div>
  </div>
);

export default AdminStatCard;
