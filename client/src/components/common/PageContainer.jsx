export function PageContainer({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  children,
  className = '',
  maxWidth = 'max-w-7xl',
}) {
  return (
    <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 ${maxWidth} ${className}`}>
      {/* Optional Breadcrumbs */}
      {breadcrumbs && <div className="mb-4 text-xs text-slate-500">{breadcrumbs}</div>}

      {/* Header section if title or actions provided */}
      {(title || subtitle || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-3">
              {title && (
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {title}
                </h1>
              )}
              {badge && <div>{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>

          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>
      )}

      {/* Main Content Area */}
      <div className="w-full">{children}</div>
    </div>
  );
}

export default PageContainer;
