import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
const ProductCard = ({
  id,
  name,
  price,
  requiresRx = false,
  composition,
  manufacturer,
  packSize,
  rating = 4.5,
  popular = false,
  fastDelivery = true,
}) => {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem({ id, name, price, requiresRx, composition });
  };

  return (
    <div className="group overflow-hidden relative bg-card-surface border border-border rounded-2xl shadow-soft hover:shadow-lifted hover:translate-y-[-4px] transition-all duration-300 h-full min-h-[280px] flex flex-col">
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-cta opacity-0 group-hover:opacity-5 transition-all duration-300 rounded-2xl pointer-events-none"></div>

      <div className="p-6 space-y-4 relative z-10 flex flex-col flex-grow">
        {/* Gradient Chips */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {popular && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#FF6B4A] to-[#FF906A] text-white shadow-sm">
                🔥 Trending
              </span>
            )}
            {fastDelivery && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-sm">
                ⚡ Fast
              </span>
            )}
          </div>
          {requiresRx && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F1FF] text-[#3A78F2] border border-[#B8D4FF]">
              Rx
            </span>
          )}
        </div>

        {/* Product Info with Icon */}
        <div className="flex items-start gap-4">
          {/* Small icon bubble */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFF4F2] to-[#FFE8E2] border border-border shadow-sm flex items-center justify-center">
            <span className="text-2xl">💊</span>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold leading-tight text-text-strong group-hover:text-brand-coral transition-colors duration-300">
              {name}
            </h4>
            <p className="text-xs text-text-muted mt-1 line-clamp-2">
              {composition || manufacturer || "Pharmaceutical Product"}
            </p>
            {manufacturer ? (
              <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
                {manufacturer}
              </p>
            ) : null}
            {packSize ? (
              <p className="text-[11px] text-text-muted line-clamp-1">
                Pack: {packSize}
              </p>
            ) : null}
          </div>
        </div>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-[#FFB800]">★</span>
            <span className="font-semibold text-text-strong">
              {rating.toFixed(1)}
            </span>
          </div>
          <span className="text-text-muted text-xs">(248)</span>
        </div>

        {/* Divider */}
        <div className="border-t border-border"></div>

        {/* Price & Actions */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div>
            <p className="text-xs text-text-muted mb-0.5">Price</p>
            <div className="text-2xl font-bold text-brand-coral">
              ₹{Number(price || 0).toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/product/${id}`}>
              <button className="px-3 py-2 text-sm font-medium text-text-strong border border-border rounded-lg hover:border-brand-coral hover:bg-[#FFF4F2] transition-all duration-200">
                View
              </button>
            </Link>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm font-semibold bg-gradient-cta text-white rounded-lg hover:shadow-glow hover:scale-105 transition-all duration-200"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
