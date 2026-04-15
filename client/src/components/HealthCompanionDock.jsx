import React from "react";
import { useLocation } from "react-router-dom";
import HealthCompanionFAB from "./HealthCompanionFAB";
import HealthCompanionPanel from "./HealthCompanionPanel";
import { useHealthCompanion } from "../context/HealthCompanionContext";
import { AuthContext } from "../context/AuthContext";

const HealthCompanionDock = () => {
  const { user } = React.useContext(AuthContext);
  const { pathname } = useLocation();
  const { isOpen, toggleOpen, close, unreadMentions } = useHealthCompanion();
  const isFullPage = pathname === "/health-companion";

  if (!user) return null;

  if (isFullPage) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <HealthCompanionPanel fullPage className="pt-2" />
      </div>
    );
  }

  return (
    <>
      <HealthCompanionFAB
        isOpen={isOpen}
        unreadMentions={unreadMentions}
        onClick={toggleOpen}
      />

      <HealthCompanionPanel
        onClose={close}
        compact
        className="left-2 right-2 md:left-auto"
      />
    </>
  );
};

export default HealthCompanionDock;
