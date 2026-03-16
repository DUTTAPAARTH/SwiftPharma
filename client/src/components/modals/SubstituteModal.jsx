import React from "react";

const SubstituteModal = ({
  baseProduct,
  options = [],
  loading = false,
  onClose,
  onAddToCart,
  onReplaceInCart,
}) => {
  if (!baseProduct) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center px-6 py-10 font-nexus-bold">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-10 border-b border-slate-100 dark:border-slate-800 relative group">
           <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-8xl font-black">rebase_edit</span>
           </div>
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                    Clinical Matching Engine
                 </div>
                 <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                   Substitution for {baseProduct.name}
                 </h3>
                 <p className="text-slate-500 text-sm font-medium">
                   Targeting Composition: <span className="text-primary font-bold">{baseProduct.composition || "Pharmacological Standard"}</span>
                 </p>
              </div>
              <button 
                onClick={onClose}
                className="size-14 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {loading ? (
             <div className="py-20 text-center space-y-6">
                <div className="size-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto"></div>
                <p className="text-slate-400 font-bold">Scanning pharmacological database...</p>
             </div>
          ) : options.length === 0 ? (
             <div className="py-20 text-center space-y-8 bg-slate-50 dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined text-7xl text-slate-200 dark:text-slate-600">search_off</span>
                <p className="text-slate-400 font-bold text-xl">No certified substitutes found for this composition.</p>
                <button onClick={onClose} className="h-14 px-8 rounded-full border border-primary text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Select Original Protocol</button>
             </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
               {options.map((option) => {
                 const cheaper = Number(option.price) < Number(baseProduct.price || Infinity);
                 const discount = Math.round(((baseProduct.price - option.price) / baseProduct.price) * 100);

                 return (
                    <div key={option._id || option.id} className="bg-white dark:bg-slate-800 rounded-[40px] p-8 border border-slate-100 dark:border-slate-700 shadow-soft flex flex-col gap-8 group hover:border-primary hover:shadow-xl transition-all">
                       <div className="flex items-start justify-between">
                          <div className="space-y-4">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{option.manufacturer || "Certified Laboratory"}</p>
                                <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">{option.name}</h4>
                             </div>
                             <div className="flex flex-wrap gap-3">
                                <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-500 border border-slate-100 dark:border-slate-700">{option.strength || "Standard"}</span>
                                {cheaper && (
                                   <span className="px-3 py-1 rounded-full bg-green-100 text-green-600 text-[10px] font-black uppercase tracking-widest border border-green-200">
                                      Save {discount}%
                                   </span>
                                )}
                             </div>
                          </div>
                          <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                             <span className="material-symbols-outlined text-primary font-black">pill</span>
                          </div>
                       </div>

                       <div className="flex flex-col gap-6 pt-6 border-t border-slate-50 dark:border-slate-700 mt-auto">
                          <div className="flex items-baseline gap-2">
                             <span className="text-2xl font-black text-slate-900 dark:text-white">₹{Number(option.price || 0).toFixed(2)}</span>
                             {option.mrp && option.mrp > option.price && (
                               <span className="text-xs text-slate-400 line-through font-bold">₹{Number(option.mrp).toFixed(2)}</span>
                             )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <button 
                               onClick={() => onReplaceInCart?.(option)}
                               className="h-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                             >
                                <span className="material-symbols-outlined text-sm">swap_horiz</span> Replace
                             </button>
                             <button 
                               onClick={() => onAddToCart?.(option)}
                               className="h-12 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                             >
                                <span className="material-symbols-outlined text-sm">add_shopping_cart</span> Add
                             </button>
                          </div>
                       </div>
                    </div>
                 );
               })}
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="p-8 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 text-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm text-green-500">verified_user</span> 
              Substitution validated by active pharmacological matching protocol
           </p>
        </div>
      </div>
    </div>
  );
};

export default SubstituteModal;
