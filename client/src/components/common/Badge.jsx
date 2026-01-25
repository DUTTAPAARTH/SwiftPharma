import React from "react";

const Badge = ({ children, tone = "primary" }) => {
  const base = "inline-flex items-center px-2 py-1 rounded text-xs font-medium";
  const styles =
    tone === "primary"
      ? "bg-tealPrimary text-brown"
      : "bg-darkGraphite text-brown";
  return <span className={`${base} ${styles}`}>{children}</span>;
};

export default Badge;
