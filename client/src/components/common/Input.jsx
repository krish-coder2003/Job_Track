import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export const Input = forwardRef(function Input(
  {
    label,
    id,
    name,
    type = 'text',
    error,
    helperText,
    icon: iconProp,
    leftIcon: leftIconProp,
    rightElement,
    disabled = false,
    required = false,
    className = '',
    inputClassName = '',
    ...props
  },
  ref
) {
  const LeftIcon = iconProp || leftIconProp;
  const inputId = id || name || `input-${Math.random().toString(36).slice(2, 8)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`w-full flex flex-col space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative rounded-lg shadow-xs flex items-center">
        {LeftIcon && (
          <div className="absolute left-3 pointer-events-none text-slate-400 flex items-center">
            {LeftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full bg-white text-slate-900 placeholder-slate-400 border rounded-lg text-sm px-3.5 py-2.5 transition-all focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
            LeftIcon ? 'pl-10' : ''
          } ${rightElement || error ? 'pr-10' : ''} ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-blue-500/20'
          } ${inputClassName}`}
          {...props}
        />

        {error ? (
          <div className="absolute right-3 pointer-events-none text-rose-500 flex items-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        ) : (
          rightElement && <div className="absolute right-3 flex items-center">{rightElement}</div>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-xs font-medium text-rose-600 flex items-center gap-1 mt-1">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
