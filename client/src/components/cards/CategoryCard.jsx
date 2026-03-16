import { useNavigate } from "react-router-dom";

const CategoryCard = ({
  id,
  name,
  description,
  productCount = 0,
  slug,
  requiresRx = false,
  icon = "medical_services",
}) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/categories/${slug}`)}
      className="group bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-[48px] p-12 border border-slate-100 dark:border-slate-800 flex flex-col gap-10 hover:shadow-2xl hover:border-primary/30 transition-all duration-500 cursor-pointer relative overflow-hidden"
    >
      {/* Ghost Icon Background */}
      <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-all duration-700 group-hover:scale-150 group-hover:-rotate-12 pointer-events-none">
        <span className="material-symbols-outlined text-[120px] text-primary font-black">
          {icon}
        </span>
      </div>

      {/* Module Header */}
      <div className="size-24 rounded-[32px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
        <span className="material-symbols-outlined text-4xl font-black transition-all duration-500 group-hover:rotate-12">
          {icon}
        </span>
      </div>

      {/* Metadata Payload */}
      <div className="space-y-6 relative z-10 flex-grow">
        <div className="flex items-center gap-3">
          {requiresRx && (
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-100 dark:border-amber-500/20 text-[9px] font-black uppercase tracking-widest">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse"></span>{" "}
              Prescription Needed
            </div>
          )}
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            {productCount}+ products available
          </span>
        </div>

        <div className="space-y-3">
          <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-sm">
            {description ||
              "Shop trusted medicines and wellness essentials in this category."}
          </p>
        </div>
      </div>

      {/* Terminal Action */}
      <div className="pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 text-primary font-black uppercase tracking-widest text-[10px]">
          Explore category
          <span className="material-symbols-outlined text-lg group-hover:translate-x-2 transition-transform font-black">
            arrow_forward
          </span>
        </div>

        <div className="flex -space-x-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="size-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm"
            >
              <span className="material-symbols-outlined text-xs text-slate-400 font-black">
                pill
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryCard;
