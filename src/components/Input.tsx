"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";

// Text Input
interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-gray-400 mb-2">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 bg-dark-input rounded-lg text-white
            border border-gold/10 focus:border-accent focus:outline-none
            placeholder-gray-500 transition-colors text-sm sm:text-base
            ${error ? "border-red-500" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-red-400 text-xs mt-1">{error}</p>
        )}
      </div>
    );
  }
);
TextInput.displayName = "TextInput";

// Number Input with +/- buttons
interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  className = "",
  ...props
}: NumberInputProps) {
  const handleChange = (newValue: number) => {
    const clamped = Math.max(min, Math.min(max, newValue));
    onChange(clamped);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-gray-400 mb-2">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleChange(value - step)}
          disabled={value <= min}
          className="w-10 h-10 rounded-lg bg-dark-input border border-gold/10 text-gray-400 hover:text-white hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => handleChange(parseFloat(e.target.value) || min)}
          min={min}
          max={max}
          step={step}
          className={`
            flex-1 px-4 py-2.5 bg-dark-input rounded-lg text-white text-center
            border border-gold/10 focus:border-accent focus:outline-none
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
            ${className}
          `}
          {...props}
        />
        <button
          type="button"
          onClick={() => handleChange(value + step)}
          disabled={value >= max}
          className="w-10 h-10 rounded-lg bg-dark-input border border-gold/10 text-gray-400 hover:text-white hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// Range Slider with value display
interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  color?: "accent" | "success" | "info" | "warning";
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  color = "accent",
}: SliderProps) {
  const colorClasses = {
    accent: "accent-accent",
    success: "accent-emerald-500",
    info: "accent-blue-500",
    warning: "accent-amber-500",
  };

  const valueColorClasses = {
    accent: "text-accent",
    success: "text-emerald-400",
    info: "text-blue-400",
    warning: "text-amber-400",
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm text-gray-400">{label}</label>
        <span className={`text-sm font-semibold ${valueColorClasses[color]}`}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className={`w-full h-2 bg-dark-input rounded-lg appearance-none cursor-pointer ${colorClasses[color]}`}
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// Select dropdown
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = "", ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-gray-400 mb-2">{label}</label>
      )}
      <select
        className={`
          w-full px-4 py-2.5 bg-dark-input rounded-lg text-white
          border border-gold/10 focus:border-accent focus:outline-none
          cursor-pointer appearance-none
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23888%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')]
          bg-no-repeat bg-[right_12px_center]
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Toggle/Checkbox
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export function Toggle({ label, checked, onChange, description }: ToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-6 bg-dark-input rounded-full border border-gold/10 peer-checked:bg-accent/20 peer-checked:border-accent/50 transition-colors" />
        <div className="absolute top-1 left-1 w-4 h-4 bg-gray-400 rounded-full peer-checked:bg-accent peer-checked:translate-x-4 transition-all" />
      </div>
      <div>
        <div className="text-sm text-gray-300 group-hover:text-white transition-colors">
          {label}
        </div>
        {description && (
          <div className="text-xs text-gray-500">{description}</div>
        )}
      </div>
    </label>
  );
}
