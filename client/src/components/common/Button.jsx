import React from "react";

const Button = ({
  children,
  variant = "primary",
  className = "",
  ...props
}) => {
  const base =
    "px-6 py-3 rounded-xl font-nexus-bold font-semibold transition-all duration-300 inline-flex items-center justify-center gap-2 active:scale-95";

  const variants = {
    primary:
      "bg-primary text-white shadow-glow hover:bg-primary-hover hover:shadow-lifted hover:scale-103",
    cta: "bg-gradient-brand bg-[length:300%_300%] animate-gradientSlow text-white shadow-glow hover:shadow-lifted hover:scale-103",
    secondary:
      "bg-page text-ink border-2 border-border-subtle hover:bg-ink hover:text-white hover:border-ink",
    outline:
      "border-2 border-primary text-primary hover:bg-primary hover:text-white",
    ghost: "text-primary hover:bg-primary/10",
  };

  const chosen = variants[variant] || variants.primary;

  return (
    <button className={`${base} ${chosen} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
