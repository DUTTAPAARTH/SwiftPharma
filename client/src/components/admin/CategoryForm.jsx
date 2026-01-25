import React from "react";

const CategoryForm = () => (
  <form className="space-y-3 bg-white p-4 rounded-lg shadow border border-tealLight">
    <input
      className="w-full border border-tealLight rounded px-3 py-2"
      placeholder="Category Name"
    />
    <button className="bg-tealPrimary text-white px-3 py-2 rounded">
      Save
    </button>
  </form>
);

export default CategoryForm;
