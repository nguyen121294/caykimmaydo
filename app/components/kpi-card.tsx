'use client';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  prefix?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  animate?: boolean;
}

export default function KpiCard({ title, value, suffix, prefix, icon: Icon, trend, trendUp, color = 'from-indigo-500 to-purple-600', animate = true }: KpiCardProps) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value ?? '0')?.replace(/[^0-9.]/g, '') ?? '0') || 0;

  useEffect(() => {
    if (!inView || !animate || isNaN(numericValue)) return;
    const duration = 1500;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, numericValue, animate]);

  // Format full number with thousand separators - NO abbreviation
  const formatValue = (v: number) => {
    const rounded = v % 1 === 0 ? Math.round(v) : parseFloat(v.toFixed(1));
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
          <p className="text-xl font-display font-bold text-gray-900">
            {prefix ?? ''}{animate ? formatValue(displayValue) : formatValue(numericValue)}{suffix ?? ''}
          </p>
          {trend && (
            <p className={`text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}
