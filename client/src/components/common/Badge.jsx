const VARIANTS = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
  navy: 'bg-slate-900 text-white border-transparent',
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
  outline: 'bg-transparent text-slate-700 border-slate-300',
};

const DOT_COLORS = {
  blue: 'bg-blue-600',
  navy: 'bg-slate-300',
  gray: 'bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  outline: 'bg-slate-500',
};

const SIZES = {
  sm: 'text-[11px] px-2 py-0.5 gap-1 font-semibold rounded-md',
  md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold rounded-lg',
};

export function Badge({
  variant = 'blue',
  size = 'md',
  dot = false,
  icon = null,
  children,
  className = '',
  ...props
}) {
  const variantStyles = VARIANTS[variant] || VARIANTS.blue;
  const sizeStyles = SIZES[size] || SIZES.md;
  const dotColor = DOT_COLORS[variant] || DOT_COLORS.blue;

  return (
    <span
      className={`inline-flex items-center justify-center border uppercase tracking-wider font-medium select-none ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
