import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";

const badgeStyles = {
  Rx: "bg-[#E8F1FF] text-[#3A78F2] border border-[#B8D4FF]",
  OTC: "bg-[#FFF4F2] text-[#FF6B4A] border border-[#FFD4CC]",
  Popular: "bg-[#FFF4F2] text-[#FF6B4A] border border-[#FFD4CC]",
  New: "bg-[#F3ECFF] text-[#8C71FF] border border-[#D4C5FF]",
  Wellness: "bg-[#F0F9F4] text-[#10B981] border border-[#C0ECD0]",
};

const CategoryCard = ({
  icon = "💊",
  name,
  description,
  tags = [],
  productCount,
  deliveryEta,
  slug,
  ctaHref,
}) => {
  const cardRef = useRef(null);
  const [glowPos, setGlowPos] = useState({ x: "50%", y: "50%" });

  const handleMouseMove = (e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlowPos({ x: `${x}%`, y: `${y}%` });
  };

  const handleMouseLeave = () => setGlowPos({ x: "50%", y: "50%" });

  return (
    <Link
      to={ctaHref || `/categories/${slug || "category"}`}
      className="category-card group h-full rounded-2xl border border-[#E5E4E0] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-all duration-300"
      style={{ "--x": glowPos.x, "--y": glowPos.y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="button"
      aria-label={`View medicines for ${name}`}
    >
      <div className="p-7 md:p-8 relative z-10 flex flex-col gap-6 min-h-[280px]">
        <div className="flex items-start gap-5">
          {/* Icon with gradient background circle */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFE8E2] via-[#FFF4F2] to-[#F7F6F4] rounded-2xl blur-sm opacity-70"></div>
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFF4F2] to-[#FFE8E2] border border-[#FFD4CC] flex items-center justify-center text-3xl shadow-[0_6px_18px_rgba(255,107,74,0.12)]">
              {icon}
            </div>
          </div>

          <div className="flex-1 space-y-2.5">
            <h3 className="text-xl font-nexus-bold text-primary-text leading-snug group-hover:text-brand-coral transition-colors duration-300">
              {name}
            </h3>
            <p className="text-sm text-secondary-text leading-relaxed font-roserri">
              {description}
            </p>
          </div>
        </div>

        {tags?.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                  badgeStyles[tag] ||
                  "bg-[#F7F6F4] text-secondary-text border border-[#E5E4E0]"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between text-sm font-medium border-t border-[#E5E4E0]">
          <div className="flex items-center gap-3 text-secondary-text">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span>
              {productCount}+ items
            </span>
            <span className="w-1 h-1 rounded-full bg-border opacity-40" />
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-coral shadow-sm"></span>
              {deliveryEta}
            </span>
          </div>
          <span className="text-brand-coral font-nexus-bold inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform duration-300">
            Browse →
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
