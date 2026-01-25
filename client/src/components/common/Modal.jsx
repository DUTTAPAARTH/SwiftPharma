import React from "react";

const Modal = ({ open, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-darkGraphite">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
