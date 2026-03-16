import React from "react";
import AdminLayout from "../../components/admin/AdminLayout";

const AdminPlaceholder = ({ title, phase }) => {
  return (
    <AdminLayout title={title}>
      <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-8">
        <p className="text-cyan-300 uppercase tracking-widest text-xs font-bold">
          {title}
        </p>
        <h2 className="text-3xl text-white font-black mt-2">
          Coming in {phase}
        </h2>
        <p className="text-slate-400 mt-3 max-w-2xl">
          This section is planned for the next implementation phase.
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminPlaceholder;
