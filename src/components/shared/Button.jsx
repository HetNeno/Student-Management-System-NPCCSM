export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3.5 text-sm rounded-2xl',
  };

  const variants = {
    primary: `bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow-md disabled:bg-indigo-300`,
    secondary: `bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:text-slate-400`,
    danger: `bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-red-300`,
    ghost: `bg-transparent text-slate-600 hover:bg-slate-100 disabled:text-slate-400`,
    outline: `bg-transparent text-indigo-600 border border-indigo-200 hover:bg-indigo-50 disabled:text-indigo-300`,
  };

  const cls = `inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 btn-press focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2 ${sizes[size]} ${variants[variant]} ${disabled || loading ? 'cursor-not-allowed' : ''} ${className}`;

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={cls} {...props}>
      {loading && <span className="spinner !w-4 !h-4 !border-2" style={{ borderTopColor: variant === 'primary' ? '#fff' : undefined }} />}
      {icon && !loading && <i className={`${icon} text-xs opacity-80`} />}
      {children}
    </button>
  );
}
