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
      "bg-brand text-brown hover:bg-gradient-coral-sunset hover:shadow-glow hover:scale-103",
    cta: "bg-brand text-brown hover:bg-gradient-coral-sunset hover:shadow-glow hover:scale-103",
    secondary:
      "bg-page text-ink border-2 border-border-subtle hover:bg-ink hover:text-brown hover:border-ink",
    outline: "border-2 border-brand text-brand hover:bg-brand hover:text-brown",
    ghost: "text-brand hover:bg-brand/10",
  };

  const chosen = variants[variant] || variants.primary;

  return (
    <button className={`${base} ${chosen} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
