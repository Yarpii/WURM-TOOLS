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
    inline-flex items-center justify-center gap-2 font-medium
    rounded-lg transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = {
    primary: `
      bg-accent text-white
      hover:bg-accent-hover
      active:scale-[0.98]
    `,
    secondary: `
      bg-bg-tertiary text-text-primary border border-border
      hover:border-border-hover hover:bg-bg-hover
    `,
    ghost: `
      text-text-secondary hover:text-text-primary hover:bg-bg-hover
    `,
    danger: `
      bg-danger/10 text-danger border border-danger/30
      hover:bg-danger/20 hover:border-danger/50
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
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
}

interface LinkButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  className?: string;
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  icon,
  className = "",
}: LinkButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center gap-2 font-medium
    rounded-lg transition-all duration-200
  `;

  const variantClasses = {
    primary: `bg-accent text-white hover:bg-accent-hover`,
    secondary: `bg-bg-tertiary text-text-primary border border-border hover:border-border-hover`,
    ghost: `text-text-secondary hover:text-text-primary hover:bg-bg-hover`,
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <Link
      href={href}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon}
      {children}
    </Link>
  );
}

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
    <div className="inline-flex bg-bg-tertiary rounded-lg p-1 border border-border">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            ${sizeClasses[size]} rounded-md transition-all duration-200
            flex items-center gap-1.5 font-medium
            ${value === option.value
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary"
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
