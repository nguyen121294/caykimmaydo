'use client';
import { LucideIcon, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  onRefresh?: () => void | Promise<void>;
  children?: React.ReactNode;
}

export default function PageHeader({ title, description, icon: Icon, onRefresh, children }: PageHeaderProps) {
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = async () => {
    setSpinning(true);
    try {
      await onRefresh?.();
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 w-full">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-sm shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {children}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200/90 hover:border-slate-300 transition-all text-slate-700 font-semibold hover:text-slate-900 hover:bg-slate-50 active:scale-95 whitespace-nowrap ${
              spinning ? 'opacity-60 pointer-events-none' : ''
            }`}
            disabled={spinning}
          >
            <RefreshCw size={14} className={spinning ? 'animate-spin text-purple-600' : 'text-slate-500'} />
            <span>Làm mới</span>
          </button>
        )}
      </div>
    </div>
  );
}
