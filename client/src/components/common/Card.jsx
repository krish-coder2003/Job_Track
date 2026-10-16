const VARIANTS = {
  default: 'bg-white border border-slate-200 shadow-xs',
  elevated: 'bg-white border border-slate-100 shadow-md',
  bordered: 'bg-white border-2 border-slate-200',
  subtle: 'bg-slate-50/80 border border-slate-200/90',
};

export function Card({ variant = 'default', className = '', children, ...props }) {
  const variantStyles = VARIANTS[variant] || VARIANTS.default;

  return (
    <div className={`rounded-xl transition-all ${variantStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={`px-6 pt-6 pb-4 border-b border-slate-100 flex flex-col space-y-1.5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }) {
  return (
    <h3 className={`text-lg font-bold text-slate-900 tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }) {
  return (
    <p className={`text-xs text-slate-500 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }) {
  return (
    <div
      className={`px-6 py-4 bg-slate-50/60 rounded-b-xl border-t border-slate-100 flex items-center justify-between gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
