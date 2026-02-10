
import React from 'react';
import { DashboardStats } from '../types';

interface DashboardProps {
  stats: DashboardStats;
}

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const cards = [
    { label: 'Total Base', value: stats.totalCount, color: 'text-white' },
    { label: 'Follow-up Hoje', value: stats.followUpsToday, color: 'text-amber-400' },
    { label: 'Follow-up Atrasado', value: stats.followUpsDelayed, color: 'text-rose-500' },
    { label: 'Volume Proposto', value: currencyFormatter.format(stats.totalProposedValue), color: 'text-white' },
    { label: 'Volume Aprovado', value: currencyFormatter.format(stats.totalApprovedValue), color: 'text-emerald-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-[#1a1a1a] p-8 rounded-[2.5rem] border border-[#2a2a2a] shadow-xl transition-all hover:scale-105 active:scale-95 group">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 group-hover:text-gray-300 transition-colors">{card.label}</p>
          <p className={`text-2xl font-black italic tracking-tighter ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
