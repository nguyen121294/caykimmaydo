'use client';
import { LucideIcon, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  onRefresh?: () => void;
  children?: React.ReactNode;
}

export default function PageHeader({ title, description, icon: Icon, onRefresh, children }: PageHeaderProps) {
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    setSpinning(true);
    onRefresh?.();
    setTimeout(() => setSpinning(false), 1000);
  };

  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-sm">
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex items-start gap-3">
        {children}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            className={`flex items-center gap-2 px-4 py-2 text-sm bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-200 transition-all text-gray-700 font-medium whitespace-nowrap ${spinning ? 'opacity-60' : ''}`}
            disabled={spinning}
          >
            <RefreshCw size={14} className={spinning ? 'animate-spin' : ''} />
            Làm mới
          </button>
        )}
      </div>
    </div>
  );
}
