import React from 'react';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const s = status?.toLowerCase() || '';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (s === 'present' || s === 'approved' || s === 'paid' || s === 'active' || s === 'settled') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (s === 'absent' || s === 'rejected' || s === 'failed' || s === 'inactive' || s === 'terminated') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (s === 'partially_paid' || s === 'partially paid') {
    colorClasses = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (s === 'payment_processing' || s === 'processing' || s === 'half day' || s === 'pending' || s === 'draft' || s === 'pending approval') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (s === 'unpaid') {
    colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
  } else if (s === 'refunded') {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (s === 'locked' || s === 'calculated') {
    colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (s === 'weekly off' || s === 'holiday' || s === 'paid leave') {
    colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center rounded-full border ${colorClasses} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
        colorClasses.includes('emerald') ? 'bg-emerald-500' :
        colorClasses.includes('rose') ? 'bg-rose-500' :
        colorClasses.includes('sky') ? 'bg-sky-500' :
        colorClasses.includes('amber') ? 'bg-amber-500 animate-pulse' :
        colorClasses.includes('orange') ? 'bg-orange-500' :
        colorClasses.includes('purple') ? 'bg-purple-500' :
        colorClasses.includes('indigo') ? 'bg-indigo-500' : 'bg-slate-400'
      }`} />
      {status}
    </span>
  );
};
