"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  isLoading,
  fullWidth,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center gap-2 font-semibold
    rounded-lg transition-all duration-200 uppercase tracking-wide
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-accent to-ember text-white
      hover:from-accent-hover hover:to-molten hover:shadow-lg hover:shadow-accent/20
      active:scale-[0.98]
    `,
    secondary: `
      bg-dark-input text-gray-300 border border-gold/20
      hover:border-gold/40 hover:text-white hover:bg-dark-card
    `,
    ghost: `
      text-gray-400 hover:text-white hover:bg-white/5
    `,
    danger: `
      bg-red-600/20 text-red-400 border border-red-500/30
      hover:bg-red-600/30 hover:border-red-500/50
    `,
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

// Link styled as button
interface LinkButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  className?: string;
  isNew?: boolean;
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  isNew,
}: LinkButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center gap-2 font-semibold
    rounded-lg transition-all duration-200 uppercase tracking-wide
    relative
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-accent to-ember text-white
      hover:from-accent-hover hover:to-molten hover:shadow-lg hover:shadow-accent/20
    `,
    secondary: `
      bg-dark-input text-gray-300 border border-gold/20
      hover:border-gold/40 hover:text-white hover:bg-dark-card
    `,
    ghost: `
      text-gray-400 hover:text-white hover:bg-white/5
    `,
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <Link
      href={href}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {icon}
      {children}
      {isNew && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] bg-accent text-white rounded-full font-bold">
          NEW
        </span>
      )}
    </Link>
  );
}

// Button Group
interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className = "" }: ButtonGroupProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {children}
    </div>
  );
}

// Toggle Button Group (like tabs)
interface ToggleButtonGroupProps<T extends string> {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}

export function ToggleButtonGroup<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: ToggleButtonGroupProps<T>) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  return (
    <div className="inline-flex bg-dark-input rounded-lg p-1 border border-gold/10">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            ${sizeClasses[size]} rounded-md transition-all duration-200
            flex items-center gap-1.5 font-medium
            ${value === option.value
              ? "bg-accent text-white shadow-sm"
              : "text-gray-400 hover:text-white"
            }
          `}
        >
          {option.icon && <span>{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
