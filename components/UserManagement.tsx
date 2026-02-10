
import React, { useState } from 'react';
import { User, UserRole, Praca } from '../types';

interface UserManagementProps {
  users: User[];
  pracas: Praca[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onRemoveUser: (id: string) => void;
  onUpdateProfile: (id: string, profile: string) => void;
  onAddPraca: (p: Praca) => void;
  onUpdatePraca: (p: Praca) => void;
  onRemovePraca: (id: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, pracas, onAddUser, onUpdateUser, onRemoveUser, onAddPraca, onUpdatePraca, onRemovePraca }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'pracas'>('users');
  const [isEditing, setIsEditing] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    nome: '', email: '', password: '', cargo: '', role: UserRole.Exec, pracaIds: [], pracaPadraoId: '', active: true
  });

  const [isEditingPraca, setIsEditingPraca] = useState<Praca | null>(null);
  const [newPraca, setNewPraca] = useState<Partial<Praca>>({ pracaId: '', nome: '', uf: '', ativo: true });

  const togglePraca = (id: string) => {
    const list = isEditing ? (isEditing.pracaIds ?? []) : (newUser.pracaIds ?? []);
    const updated = list.includes(id) ? list.filter(p => p !== id) : [...list, id];
    if (isEditing) setIsEditing({...isEditing, pracaIds: updated});
    else setNewUser({...newUser, pracaIds: updated});
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    if (isEditing) { onUpdateUser({...isEditing, updatedAt: now}); setIsEditing(null); }
    else { 
      onAddUser({ ...newUser, id: Date.now().toString(), createdAt: now, updatedAt: now } as User); 
      setNewUser({ nome: '', email: '', password: '', cargo: '', role: UserRole.Exec, pracaIds: [], pracaPadraoId: '' }); 
    }
  };

  const handlePracaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingPraca) {
      onUpdatePraca({ ...isEditingPraca } as Praca);
      setIsEditingPraca(null);
    } else {
      if (!newPraca.pracaId) return alert("ID da Praça é obrigatório.");
      onAddPraca({ ...newPraca, ativo: true } as Praca);
      setNewPraca({ pracaId: '', nome: '', uf: '', ativo: true });
    }
  };

  const inputClass = "w-full px-5 py-4 rounded-2xl border border-[#333] bg-[#1a1a1a] text-white focus:ring-2 focus:ring-white outline-none text-sm font-semibold transition-all";

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex bg-[#111] p-1.5 rounded-3xl border border-[#222] w-fit">
        <button onClick={() => setActiveTab('users')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>Usuários</button>
        <button onClick={() => setActiveTab('pracas')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pracas' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>Gerenciar Praças</button>
      </div>

      {activeTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
          <div className="bg-[#1a1a1a] p-10 rounded-[3rem] border border-[#2a2a2a] shadow-2xl h-fit">
            <h3 className="text-2xl font-black text-white mb-10 uppercase italic tracking-tighter">{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <form onSubmit={handleUserSubmit} className="space-y-6">
              <input required placeholder="Nome Completo" value={isEditing ? isEditing.nome : newUser.nome} onChange={e => isEditing ? setIsEditing({...isEditing, nome: e.target.value}) : setNewUser({...newUser, nome: e.target.value})} className={inputClass} />
              <input required placeholder="E-mail" value={isEditing ? isEditing.email : newUser.email} onChange={e => isEditing ? setIsEditing({...isEditing, email: e.target.value}) : setNewUser({...newUser, email: e.target.value})} className={inputClass} />
              <input required placeholder="Senha" type="password" value={isEditing ? isEditing.password : newUser.password} onChange={e => isEditing ? setIsEditing({...isEditing, password: e.target.value}) : setNewUser({...newUser, password: e.target.value})} className={inputClass} />
              <input placeholder="Cargo" value={isEditing ? isEditing.cargo : newUser.cargo} onChange={e => isEditing ? setIsEditing({...isEditing, cargo: e.target.value}) : setNewUser({...newUser, cargo: e.target.value})} className={inputClass} />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Role</label>
                  <select value={isEditing ? isEditing.role : newUser.role} onChange={e => {
                    const r = e.target.value as UserRole;
                    if (isEditing) setIsEditing({...isEditing, role: r});
                    else setNewUser({...newUser, role: r});
                  }} className={inputClass}>
                    {Object.values(UserRole).map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Praça Padrão</label>
                  <select required value={isEditing ? isEditing.pracaPadraoId : newUser.pracaPadraoId} onChange={e => isEditing ? setIsEditing({...isEditing, pracaPadraoId: e.target.value}) : setNewUser({...newUser, pracaPadraoId: e.target.value})} className={inputClass}>
                    <option value="" disabled>Selecione</option>
                    {(isEditing ? (isEditing.pracaIds ?? []) : (newUser.pracaIds ?? [])).map(pid => {
                      const p = (pracas ?? []).find(item => item?.pracaId === pid);
                      return <option key={pid} value={pid}>{p?.nome || pid}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-black text-gray-500 uppercase mb-4 tracking-widest italic">Territórios Atendidos</label>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {(pracas ?? []).map(p => (
                    <button key={p?.pracaId} type="button" onClick={() => togglePraca(p?.pracaId)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${ (isEditing ? (isEditing.pracaIds ?? []) : (newUser.pracaIds ?? [])).includes(p?.pracaId) ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-[#333]' }`}>
                      {p?.nome}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase shadow-xl">{isEditing ? 'Salvar' : 'Criar'}</button>
              {isEditing && <button type="button" onClick={() => setIsEditing(null)} className="w-full py-2 text-[9px] font-black uppercase text-gray-500">Cancelar</button>}
            </form>
          </div>

          <div className="lg:col-span-2 bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] overflow-hidden shadow-2xl">
            <table className="min-w-full divide-y divide-[#2a2a2a]">
              <thead className="bg-[#222]"><tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest"><th className="px-10 py-6 text-left">Executivo</th><th className="px-10 py-6 text-left">Role / Praças</th><th className="px-10 py-6 text-right">Ações</th></tr></thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {(users ?? []).map(u => (
                  <tr key={u?.id} className="hover:bg-[#222]">
                    <td className="px-10 py-8">
                      <p className="text-lg font-black text-white uppercase italic">{u?.nome}</p>
                      <p className="text-[9px] font-black uppercase text-gray-500">{u?.cargo}</p>
                    </td>
                    <td className="px-10 py-8">
                      <p className={`text-[9px] font-black uppercase mb-2 ${u?.role === UserRole.Admin ? 'text-amber-500' : 'text-gray-400'}`}>{u?.role}</p>
                      <div className="flex flex-wrap gap-1">
                        {(u?.pracaIds ?? []).map(pid => <span key={pid} className="bg-[#111] px-2 py-0.5 rounded text-[8px] text-gray-400 font-black border border-[#333]">{pid}</span>)}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <button onClick={() => setIsEditing(u)} className="p-3 text-white border border-[#333] rounded-2xl hover:bg-[#333]">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
          <div className="bg-[#1a1a1a] p-10 rounded-[3rem] border border-[#2a2a2a] shadow-2xl h-fit">
            <h3 className="text-2xl font-black text-white mb-10 uppercase italic tracking-tighter">{isEditingPraca ? 'Editar Praça' : 'Nova Praça'}</h3>
            <form onSubmit={handlePracaSubmit} className="space-y-6">
              <input required disabled={!!isEditingPraca} placeholder="Sigla (ID) - Ex: BH" value={isEditingPraca ? isEditingPraca.pracaId : newPraca.pracaId} onChange={e => setNewPraca({...newPraca, pracaId: e.target.value.toUpperCase()})} className={inputClass} />
              <input required placeholder="Nome Completo - Ex: Belo Horizonte" value={isEditingPraca ? isEditingPraca.nome : newPraca.nome} onChange={e => isEditingPraca ? setIsEditingPraca({...isEditingPraca, nome: e.target.value}) : setNewPraca({...newPraca, nome: e.target.value})} className={inputClass} />
              <input placeholder="UF" maxLength={2} value={isEditingPraca ? isEditingPraca.uf : newPraca.uf} onChange={e => isEditingPraca ? setIsEditingPraca({...isEditingPraca, uf: e.target.value.toUpperCase()}) : setNewPraca({...newPraca, uf: e.target.value.toUpperCase()})} className={inputClass} />
              
              <div className="flex items-center gap-3 px-4">
                <input type="checkbox" checked={isEditingPraca ? isEditingPraca.ativo : newPraca.ativo} onChange={e => isEditingPraca ? setIsEditingPraca({...isEditingPraca, ativo: e.target.checked}) : setNewPraca({...newPraca, ativo: e.target.checked})} />
                <label className="text-xs font-black uppercase text-gray-500">Praça Ativa</label>
              </div>

              <button type="submit" className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase shadow-xl">{isEditingPraca ? 'Salvar' : 'Criar'}</button>
              {isEditingPraca && <button type="button" onClick={() => setIsEditingPraca(null)} className="w-full py-2 text-[9px] font-black uppercase text-gray-500">Cancelar</button>}
            </form>
          </div>

          <div className="lg:col-span-2 bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] overflow-hidden shadow-2xl">
            <table className="min-w-full divide-y divide-[#2a2a2a]">
              <thead className="bg-[#222]"><tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest"><th className="px-10 py-6 text-left">Praça</th><th className="px-10 py-6 text-left">Status</th><th className="px-10 py-6 text-right">Ações</th></tr></thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {(pracas ?? []).map(p => (
                  <tr key={p?.pracaId} className="hover:bg-[#222]">
                    <td className="px-10 py-8">
                      <p className="text-lg font-black text-white uppercase italic">{p?.nome} ({p?.pracaId})</p>
                      <p className="text-[9px] font-black uppercase text-gray-500">{p?.uf || '-'}</p>
                    </td>
                    <td className="px-10 py-8">
                       <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase border ${p?.ativo ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800' : 'bg-rose-900/40 text-rose-400 border-rose-800'}`}>{p?.ativo ? 'Ativa' : 'Inativa'}</span>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex justify-end gap-3">
                        <button onClick={() => setIsEditingPraca(p)} className="p-3 text-white border border-[#333] rounded-2xl hover:bg-[#333]">Edit</button>
                        <button onClick={() => onRemovePraca(p?.pracaId)} className="p-3 text-rose-500 border border-rose-900/30 rounded-2xl hover:bg-rose-900/10">Del</button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
