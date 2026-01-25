import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../components/admin/AdminSidebar";
import PrescriptionReviewCard from "../components/admin/PrescriptionReviewCard";
import Button from "../components/common/Button";
import {
  adminListPrescriptions,
  adminReviewPrescription,
} from "../services/prescriptionService";

const AdminOrders = () => {
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await adminListPrescriptions();
      setPrescriptions(data);
    };
    load();
  }, []);

  const onDecision = async (id, status, notes) => {
    await adminReviewPrescription(id, { status, adminNotes: notes });
    const { data } = await adminListPrescriptions();
    setPrescriptions(data);
  };

  return (
    <div className="min-h-screen bg-cloudWhite flex">
      <AdminSidebar />
      <main className="flex-1 p-8 space-y-6">
        <div>
          <h1 className="text-headline mb-2">Orders & Prescriptions</h1>
          <div className="accent-bar w-16"></div>
        </div>
        <div className="card-base p-8 space-y-3">
          {prescriptions.length === 0 ? (
            <p className="text-ink-soft text-sm">No prescriptions to review.</p>
          ) : (
            prescriptions.map((p) => (
              <PrescriptionReviewCard
                key={p._id}
                data={p}
                onDecision={onDecision}
              />
            ))
          )}
        </div>
        <div className="flex gap-3">
          <Link to="/admin">
            <Button variant="primary">Back to Dashboard</Button>
          </Link>
          <Link to="/admin/products">
            <Button variant="cta">Manage Products</Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminOrders;
