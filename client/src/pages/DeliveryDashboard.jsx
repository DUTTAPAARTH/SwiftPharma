import React from "react";
import { Link } from "react-router-dom";
import DeliveryAgentOrderCard from "../components/cards/DeliveryAgentOrderCard";
import Button from "../components/common/Button";

const DeliveryDashboard = () => (
  <div className="min-h-screen bg-page p-8 space-y-6">
    <div>
      <h1 className="text-headline font-nexus-bold mb-4">Delivery Dashboard</h1>
      <div className="accent-bar-violet w-20"></div>
    </div>
    <div className="card-base p-8">
      <DeliveryAgentOrderCard
        orderId="1234"
        address="221B Baker Street"
        status="Out for Delivery"
      />
    </div>
    <div className="flex gap-3">
      <Button variant="cta" className="flex-1 text-lg py-3">
        Mark as Delivered
      </Button>
      <Button variant="secondary" className="flex-1 text-lg py-3">
        View Map
      </Button>
      <Link to="/" className="flex-1">
        <Button variant="secondary" className="w-full text-lg py-3">
          Home
        </Button>
      </Link>
    </div>
  </div>
);

export default DeliveryDashboard;
