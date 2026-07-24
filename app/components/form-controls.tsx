'use client';
import { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg bg-gray-100 hover:bg-gray-200 p-2 transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
  placeholder,
}: {
  label: string;
  value: any;
  onChange?: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 disabled:text-gray-500"
      />
    </label>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-700">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || '— Không chọn —'}
          </option>
        ))}
      </select>
    </label>
  );
}
