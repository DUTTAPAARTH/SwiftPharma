import React from "react";

const ProductForm = () => (
  <form className="space-y-3 bg-white p-4 rounded-lg shadow border border-tealLight">
    <input
      className="w-full border border-tealLight rounded px-3 py-2"
      placeholder="Product Name"
    />
    <input
      className="w-full border border-tealLight rounded px-3 py-2"
      placeholder="Price"
    />
    <button className="bg-tealPrimary text-brown px-3 py-2 rounded">
      Save
    </button>
  </form>
);

export default ProductForm;
