
import React, { useState } from 'react';
import { Praca } from '../types';

interface PracaManagementProps {
  pracas: Praca[];
  onAddPraca: (p: Praca) => void;
  onRemovePraca: (id: string) => void;
}

const PracaManagement: React.FC<PracaManagementProps> = ({ pracas, onAddPraca, onRemovePraca }) => {
  const [newPraca, setNewPraca] = useState<Partial<Praca>>({ pracaId: '', nome: '', uf: '', ativo: true });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPraca.pracaId || !newPraca.nome) {
      alert("Sigla e Nome são obrigatórios.");
      return;
    }

    const pracaId = newPraca.pracaId.toUpperCase().trim();
    if (pracas.some(p => p.pracaId === pracaId)) {
      alert("Já existe uma praça com esta sigla.");
      return;
    }

    onAddPraca({
      pracaId,
      nome: newPraca.nome,
      uf: newPraca.uf?.toUpperCase().trim(),
      ativo: true
    } as Praca);

    setNewPraca({ pracaId: '', nome: '', uf: '', ativo: true });
  };

  const inputClass = "w-full px-5 py-4 rounded-2xl border border-[#333] bg-[#1a1a1a] text-white focus:ring-2 focus:ring-white outline-none text-sm font-semibold transition-all uppercase";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Formulário de Cadastro */}
      <div className="bg-[#1a1a1a] p-10 rounded-[3rem] border border-[#2a2a2a] shadow-2xl h-fit">
        <h3 className="text-2xl font-black text-white mb-10 uppercase italic tracking-tighter">Nova Praça</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block ml-2">Sigla (ID Único)</label>
            <input 
              required 
              placeholder="Ex: BH, SP" 
              value={newPraca.pracaId} 
              onChange={e => setNewPraca({...newPraca, pracaId: e.target.value})} 
              className={inputClass} 
            />
          </div>
          <div>
            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block ml-2">Nome da Praça</label>
            <input 
              required 
              placeholder="Ex: Belo Horizonte" 
              value={newPraca.nome} 
              onChange={e => setNewPraca({...newPraca, nome: e.target.value})} 
              className={inputClass} 
            />
          </div>
          <div>
            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block ml-2">UF</label>
            <input 
              placeholder="Ex: MG" 
              maxLength={2} 
              value={newPraca.uf} 
              onChange={e => setNewPraca({...newPraca, uf: e.target.value})} 
              className={inputClass} 
            />
          </div>
          
          <button type="submit" className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl mt-4 hover:scale-105 active:scale-95 transition-all">
            Cadastrar Praça
          </button>
        </form>
      </div>

      {/* Listagem e Exclusão */}
      <div className="lg:col-span-2 bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] overflow-hidden shadow-2xl">
        <div className="px-10 py-6 border-b border-[#222] bg-[#111]">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Territórios Cadastrados</p>
        </div>
        <table className="min-w-full divide-y divide-[#2a2a2a]">
          <thead className="bg-[#111]">
            <tr className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              <th className="px-10 py-6 text-left">Praça</th>
              <th className="px-10 py-6 text-left">Status</th>
              <th className="px-10 py-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2a]">
            {(pracas ?? []).length === 0 ? (
              <tr>
                <td colSpan={3} className="px-10 py-20 text-center text-gray-600 font-bold uppercase text-[10px]">Nenhuma praça cadastrada.</td>
              </tr>
            ) : (
              pracas.map(p => (
                <tr key={p.pracaId} className="hover:bg-[#151515] transition-colors">
                  <td className="px-10 py-8">
                    <p className="text-lg font-black text-white uppercase italic tracking-tighter">{p.nome} ({p.pracaId})</p>
                    <p className="text-[9px] font-black uppercase text-gray-500">{p.uf || 'Brasil'}</p>
                  </td>
                  <td className="px-10 py-8">
                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase border ${p.ativo ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800' : 'bg-rose-900/40 text-rose-400 border-rose-800'}`}>
                      {p.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button 
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir a praça ${p.nome}?`)) {
                          onRemovePraca(p.pracaId);
                        }
                      }} 
                      className="p-4 text-rose-500 border border-rose-900/30 rounded-2xl hover:bg-rose-900/20 transition-all font-black text-[10px] uppercase tracking-widest"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PracaManagement;
