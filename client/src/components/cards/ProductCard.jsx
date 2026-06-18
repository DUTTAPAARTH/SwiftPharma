import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
import { ensureAuthenticated } from "../../utils/auth";

const normalizeImageSrc = (value) => {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return value.startsWith("/") ? value : `/${value}`;
};

const ProductCard = (props) => {
  const {
    product,
    onSubstitute,
    onAdd,
    onView,
    onToggleSave,
    rating = 4.5,
    popular = false,
    fastDelivery = true,
  } = props;

  const resolvedProduct = product || props;
  const id = resolvedProduct?._id || resolvedProduct?.id;
  const name = resolvedProduct?.name || "Medicine";
  const price = resolvedProduct?.price || 0;
  const requiresRx = Boolean(
    resolvedProduct?.requiresRx ??
    resolvedProduct?.prescriptionRequired ??
    resolvedProduct?.isRx,
  );
  const composition = resolvedProduct?.composition;
  const manufacturer = resolvedProduct?.manufacturer || resolvedProduct?.brand;
  const packSize = resolvedProduct?.packSize;
  const imageSrc = normalizeImageSrc(
    resolvedProduct?.image || resolvedProduct?.images?.[0],
  );

  const { addItem } = useCart();
  const { toggle, isSaved } = useWishlist();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const productPayload = {
    id,
    productId: id,
    name,
    price,
    requiresRx,
    composition,
    manufacturer,
    packSize,
  };

  const handleAdd = (event) => {
    event.stopPropagation();
    if (!ensureAuthenticated(navigate)) return;
    setAdding(true);
    if (onAdd) {
      onAdd({
        ...resolvedProduct,
        ...productPayload,
        isRx: requiresRx,
        requiresRx,
      });
    } else {
      addItem({
        ...productPayload,
        image: imageSrc,
        isRx: requiresRx,
        requiresRx,
      });
    }
    setTimeout(() => setAdding(false), 800);
  };

  const handleSave = (event) => {
    event.stopPropagation();
    if (!ensureAuthenticated(navigate)) return;
    setSaving(true);
    if (onToggleSave) {
      onToggleSave({ ...resolvedProduct, ...productPayload, image: imageSrc });
    } else {
      toggle({ ...productPayload, image: imageSrc });
    }
    setTimeout(() => setSaving(false), 500);
  };

  const handleView = () => {
    if (onView) {
      onView({ ...resolvedProduct, ...productPayload, image: imageSrc });
      return;
    }
    navigate(`/product/${id}`);
  };

  const handleSubstitute = (event) => {
    event.stopPropagation();
    if (onSubstitute) {
      onSubstitute({ ...resolvedProduct, ...productPayload, image: imageSrc });
    }
  };

  return (
    <div
      onClick={handleView}
      className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* Image Area */}
      <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-800 relative overflow-hidden">
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
          {requiresRx && (
            <span className="inline-flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm">
              <span className="material-symbols-outlined text-[11px]">
                prescription
              </span>
              Rx
            </span>
          )}
          {popular && (
            <span className="inline-flex items-center gap-1 bg-rose-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm">
              <span className="material-symbols-outlined text-[11px]">
                trending_up
              </span>
              Trending
            </span>
          )}
        </div>

        {/* Wishlist button (always visible on hover) */}
        <button
          onClick={handleSave}
          className="absolute top-3 right-3 z-20 size-9 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 duration-300"
        >
          <span className="material-symbols-outlined text-base">
            {isSaved(id) ? "favorite" : "favorite_border"}
          </span>
        </button>

        <div className="absolute inset-0">
          {imageSrc && (
          <img
            src={imageSrc}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = "none";
              const fallback = e.target.parentElement?.querySelector(".img-fallback");
              if (fallback) fallback.style.display = "flex";
            }}
          />
          )}
          <div
            className="img-fallback absolute inset-0 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700"
            style={{ display: imageSrc ? "none" : "flex" }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/70 dark:bg-slate-900/70 shadow-inner backdrop-blur-sm border border-white/50 dark:border-slate-600/50">
              <svg
                viewBox="0 0 64 64"
                className="h-12 w-12"
                aria-hidden="true"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="12"
                  y="20"
                  width="40"
                  height="24"
                  rx="12"
                  fill="#13b6ec"
                  fillOpacity="0.15"
                  stroke="#13b6ec"
                  strokeWidth="2.5"
                />
                <path
                  d="M24 40L40 24"
                  stroke="#13b6ec"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M20 28H28"
                  stroke="#13b6ec"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M36 36H44"
                  stroke="#13b6ec"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Gradient overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent z-10 pointer-events-none" />
      </div>

      {/* Card Body */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Rating row */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`material-symbols-outlined text-xs ${star <= Math.round(rating) ? "text-amber-400" : "text-slate-200 dark:text-slate-700"}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {rating}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            · 2.4k
          </span>
        </div>

        {/* Name */}
        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2">
          {name}
        </h3>

        {/* Composition */}
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4 line-clamp-1">
          {composition || "Premium Healthcare Product"}
        </p>

        {/* Delivery badge */}
        {fastDelivery && (
          <div className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full w-fit mb-4">
            <span
              className="material-symbols-outlined text-xs"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            20 mins delivery
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800 mt-auto pt-4 flex items-center justify-between">
          {/* Price */}
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Price
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              ₹{price}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onSubstitute && (
              <button
                type="button"
                onClick={handleSubstitute}
                className="size-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                title="Find alternatives"
              >
                <span className="material-symbols-outlined text-base">
                  compare_arrows
                </span>
              </button>
            )}
            <button
              onClick={handleAdd}
              className={`h-9 px-4 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                adding
                  ? "bg-emerald-500 shadow-emerald-200 dark:shadow-emerald-900"
                  : "bg-primary hover:bg-primary-hover shadow-primary/20"
              } active:scale-95`}
            >
              <span
                className="material-symbols-outlined text-sm"
                style={{
                  fontVariationSettings: adding ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {adding ? "check_circle" : "add_shopping_cart"}
              </span>
              {adding ? "Added" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
