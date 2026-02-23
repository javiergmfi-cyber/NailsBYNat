"use client";

import { useState, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = props.value !== undefined && props.value !== "";
  const isActive = focused || hasValue;
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={`relative ${className}`}>
      <input
        id={inputId}
        className={`peer w-full rounded-[var(--radius-md)] border bg-white px-4 pb-2 pt-6 text-espresso transition-all placeholder:text-transparent focus:outline-none focus:ring-2 focus:ring-coral/30 ${
          error
            ? "border-terracotta focus:ring-terracotta/30"
            : "border-gold/20 focus:border-coral/50"
        }`}
        style={{ minHeight: 52 }}
        placeholder={label}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={`pointer-events-none absolute left-4 transition-all duration-200 ${
          isActive
            ? "top-2 text-xs text-warm-gray"
            : "top-1/2 -translate-y-1/2 text-sm text-warm-gray"
        }`}
      >
        {label}
      </label>
      {error && (
        <p className="mt-1 text-xs text-terracotta">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className = "",
  id,
  ...props
}: TextareaProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = props.value !== undefined && props.value !== "";
  const isActive = focused || hasValue;
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={`relative ${className}`}>
      <textarea
        id={inputId}
        className={`peer w-full resize-none rounded-[var(--radius-md)] border bg-white px-4 pb-3 pt-6 text-espresso transition-all placeholder:text-transparent focus:outline-none focus:ring-2 focus:ring-coral/30 ${
          error
            ? "border-terracotta focus:ring-terracotta/30"
            : "border-gold/20 focus:border-coral/50"
        }`}
        rows={3}
        placeholder={label}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={`pointer-events-none absolute left-4 transition-all duration-200 ${
          isActive
            ? "top-2 text-xs text-warm-gray"
            : "top-4 text-sm text-warm-gray"
        }`}
      >
        {label}
      </label>
      {error && (
        <p className="mt-1 text-xs text-terracotta">{error}</p>
      )}
    </div>
  );
}
