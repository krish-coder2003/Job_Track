import { Loader2 } from 'lucide-react';

const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const VARIANTS = {
  primary: 'text-blue-600',
  navy: 'text-slate-900',
  slate: 'text-slate-400',
  white: 'text-white',
};

export function LoadingIndicator({
  size = 'md',
  variant = 'primary',
  text = null,
  className = '',
}) {
  const sizeClass = SIZES[size] || SIZES.md;
  const variantClass = VARIANTS[variant] || VARIANTS.primary;

  return (
    <div className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClass} ${variantClass}`} />
      {text && <span className="text-xs font-medium text-slate-500">{text}</span>}
    </div>
  );
}

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-md ${className}`}
      {...props}
    />
  );
}

export function PageLoader({ message = 'Loading workspace...' }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-xs">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-600 animate-pulse">{message}</p>
    </div>
  );
}

export default LoadingIndicator;
