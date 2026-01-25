import React from "react";

const DarkModeToggle = ({ enabled = false, onToggle = () => {} }) => (
  <button
    type="button"
    onClick={onToggle}
    className="px-3 py-2 rounded-full border border-darkGraphite text-darkGraphite bg-tealLight"
  >
    {enabled ? "Dark" : "Light"} Mode
  </button>
);

export default DarkModeToggle;
