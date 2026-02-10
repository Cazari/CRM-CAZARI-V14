
import React, { useState, useMemo, useEffect } from 'react';
import { Proposal, ProposalStatus, DashboardStats, User, UserRole, Praca, ReservationStatus, ProposalItem, PaymentMethod, WithdrawalType, AppSettings, ProfileAuditLog, Event, ProposalPackageItem } from './types';
import { MOCK_DATA, STATUS_COLORS, INITIAL_USERS, INITIAL_PRACAS } from './constants';
import Dashboard from './components/Dashboard';
import ProposalForm from './components/ProposalForm';
import UserManagement from './components/UserManagement';
import EventManagement from './components/EventManagement';
import ImportExport from './components/ImportExport';
import PracaManagement from './components/PracaManagement';
import { auditProposals } from './services/geminiService';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, HeadingLevel } from 'docx';

type NavigationTab = 'dashboard' | 'proposals' | 'events' | 'pracas' | 'import' | 'users';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

// Utility to normalize pracaIds from string or array
const normalizePracaIds = (ids: any): string[] => {
  if (!ids) return [];
  if (Array.isArray(ids)) return ids.map(id => String(id).trim()).filter(Boolean);
  if (typeof ids === 'string') return ids.split(';').map(id => id.trim()).filter(Boolean);
  return [];
};

const App: React.FC = () => {
  // State initialization with robust error handling and fallbacks
  const [pracas, setPracas] = useState<Praca[]>(() => {
    try {
      const saved = localStorage.getItem('cazari_v15_pracas');
      return saved ? JSON.parse(saved) : INITIAL_PRACAS;
    } catch (e) {
      console.error("Erro ao carregar praças:", e);
      return INITIAL_PRACAS;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('cazari_v15_users');
      const parsed = saved ? JSON.parse(saved) : INITIAL_USERS;
      return (Array.isArray(parsed) ? parsed : INITIAL_USERS).map(u => ({
        ...u,
        pracaIds: normalizePracaIds(u.pracaIds),
        active: u.active ?? true
      }));
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('cazari_v15_session');
      if (!saved) return null;
      const user = JSON.parse(saved);
      return { ...user, pracaIds: normalizePracaIds(user.pracaIds) };
    } catch (e) {
      return null;
    }
  });

  const [events, setEvents] = useState<Event[]>(() => {
    try {
      const saved = localStorage.getItem('cazari_v15_events');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [proposals, setProposals] = useState<Proposal[]>(() => {
    try {
      const saved = localStorage.getItem('cazari_v15_proposals');
      const raw: any[] = saved ? JSON.parse(saved) : MOCK_DATA;
      if (!Array.isArray(raw)) return [];

      return raw.map(p => {
        const ownerId = p.ownerUserId || p.responsibleExecutiveId || '1';
        let pracaId = p.pracaId;
        if (!pracaId) {
          if (p.packageItems && p.packageItems.length > 0) {
            const firstEvt = events.find(e => e.eventId === p.packageItems[0].eventId);
            pracaId = firstEvt?.pracaId || 'BH';
          } else {
            pracaId = 'BH';
          }
        }
        return { 
          ...p, 
          ownerUserId: ownerId,
          pracaId: pracaId,
          packageItems: p.packageItems || [],
          items: p.items || []
        };
      });
    } catch (e) {
      console.error("Erro ao carregar propostas:", e);
      return [];
    }
  });

  // Global Filters
  const [selectedPraca, setSelectedPraca] = useState<string>('todas');
  const [selectedExecutive, setSelectedExecutive] = useState<string>('todos');

  // UI States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const currencyFormatter = useMemo(() => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('cazari_v15_pracas', JSON.stringify(pracas));
      localStorage.setItem('cazari_v15_users', JSON.stringify(users));
      localStorage.setItem('cazari_v15_events', JSON.stringify(events));
      localStorage.setItem('cazari_v15_proposals', JSON.stringify(proposals));
      if (currentUser) localStorage.setItem('cazari_v15_session', JSON.stringify(currentUser));
      else localStorage.removeItem('cazari_v15_session');
    } catch (e) {
      console.warn("Storage error:", e);
    }
  }, [pracas, users, events, proposals, currentUser]);

  const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const isAdmin = currentUser?.role === UserRole.Admin;

  // Derived States - Safe Rendering Protections
  const executivesInPraca = useMemo(() => {
    const list = (users ?? []).filter(u => u?.active);
    if (selectedPraca === 'todas') return list;
    return list.filter(u => normalizePracaIds(u.pracaIds).includes(selectedPraca));
  }, [users, selectedPraca]);

  const filteredProposals = useMemo(() => {
    if (!currentUser) return [];
    let result = (proposals ?? []);
    
    if (selectedPraca !== 'todas') {
      result = result.filter(p => p?.pracaId === selectedPraca);
    }
    if (selectedExecutive !== 'todos') {
      result = result.filter(p => p?.ownerUserId === selectedExecutive);
    }
    if (!isAdmin && currentUser) {
      result = result.filter(p => 
        p?.ownerUserId === currentUser.id || 
        normalizePracaIds(currentUser.pracaIds).includes(p?.pracaId)
      );
    }
    return result;
  }, [proposals, selectedPraca, selectedExecutive, currentUser, isAdmin]);

  const filteredEvents = useMemo(() => {
    const list = (events ?? []);
    if (selectedPraca === 'todas') return list;
    return list.filter(e => e?.pracaId === selectedPraca);
  }, [events, selectedPraca]);

  const stats: DashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const visible = filteredProposals;
    const byStatus: Record<ProposalStatus, number> = {
      [ProposalStatus.PrimeiraProposta]: 0, [ProposalStatus.Pendente]: 0,
      [ProposalStatus.EmAndamento]: 0, [ProposalStatus.Negativa]: 0, [ProposalStatus.Concluida]: 0,
    };
    let totalProposedValue = 0;
    let totalApprovedValue = 0;
    let totalSlots = 0;
    
    visible.forEach(p => {
      if (!p) return;
      if (byStatus[p.status] !== undefined) byStatus[p.status]++;
      
      const pVal = (p.packageItems ?? []).reduce((acc, pi) => acc + (pi.quantidadeVagas * pi.valorUnitario), 0);
      const pSlots = (p.packageItems ?? []).reduce((acc, pi) => acc + pi.quantidadeVagas, 0);
      
      totalProposedValue += pVal;
      totalSlots += pSlots;
      if (p.status === ProposalStatus.Concluida) totalApprovedValue += pVal;
    });

    return { 
      totalCount: visible.length, byStatus, totalValue: totalProposedValue, totalSlots, 
      followUpsToday: visible.filter(p => p?.returnDate === today).length,
      followUpsDelayed: visible.filter(p => p?.returnDate < today && p?.status !== ProposalStatus.Concluida).length,
      sentCount: visible.length, approvedCount: byStatus[ProposalStatus.Concluida], 
      totalProposedValue, totalApprovedValue 
    };
  }, [filteredProposals]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = users.find(u => u.active && (u.email === loginEmail || u.nome === loginEmail) && u.password === loginPass);
      if (user) {
        const normalizedUser = { ...user, pracaIds: normalizePracaIds(user.pracaIds) };
        setCurrentUser(normalizedUser);
        setSelectedPraca(normalizedUser.pracaPadraoId || 'todas');
        showFeedback(`Bem-vindo, ${normalizedUser.nome}!`, 'success');
      } else {
        showFeedback("Credenciais inválidas ou usuário inativo.", 'error');
      }
    } catch (err) {
      showFeedback("Erro ao processar login.", "error");
    }
  };

  const handleAddPraca = (p: Praca) => {
    setPracas(prev => [...(prev ?? []), { ...p, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
    showFeedback(`Praça ${p.nome} adicionada com sucesso.`, 'success');
  };

  const handleUpdatePraca = (p: Praca) => {
    setPracas(prev => (prev ?? []).map(item => item.pracaId === p.pracaId ? { ...p, updatedAt: new Date().toISOString() } : item));
    showFeedback(`Praça ${p.nome} atualizada.`, 'success');
  };

  const handleRemovePraca = (id: string) => {
    // Basic dependency check
    const isUsedByUser = (users ?? []).some(u => u.active && normalizePracaIds(u.pracaIds).includes(id));
    const isUsedByEvent = (events ?? []).some(e => e.pracaId === id);
    const isUsedByProposal = (proposals ?? []).some(p => p.pracaId === id);

    if (isUsedByUser || isUsedByEvent || isUsedByProposal) {
      showFeedback("Não é possível excluir esta Praça em uso (usuários, eventos ou propostas vinculados).", "error");
      return;
    }

    setPracas(prev => (prev ?? []).filter(p => p.pracaId !== id));
    showFeedback("Praça removida.", 'success');
  };

  // Login Screen render guard
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
        <div className="bg-[#1a1a1a] p-12 rounded-[3rem] border border-[#222] w-full max-w-md shadow-2xl">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-10 text-center">Cazari <span className="text-gray-600">V15</span></h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <input required placeholder="E-mail ou Nome" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-[#333] bg-[#111] text-white focus:ring-2 focus:ring-white outline-none font-bold" />
            <input required placeholder="Senha" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-[#333] bg-[#111] text-white focus:ring-2 focus:ring-white outline-none font-bold" />
            <button type="submit" className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 md:p-12 font-sans selection:bg-white selection:text-black">
      {notification && (
        <div className={`fixed top-10 right-10 z-[100] px-8 py-4 rounded-2xl shadow-2xl font-black uppercase text-[10px] tracking-widest animate-in slide-in-from-right-10 ${notification.type === 'error' ? 'bg-rose-600 text-white' : 'bg-white text-black'}`}>
          {notification.message}
        </div>
      )}
      
      <nav className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">Cazari <span className="text-gray-600">V15</span></h1>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Gestão Territorial de Propostas</p>
        </div>

        <div className="flex bg-[#111] p-1.5 rounded-3xl border border-[#222]">
          {(['dashboard', 'proposals', 'events', 'pracas', 'import', 'users'] as NavigationTab[]).map(tab => (
            ((tab !== 'users' && tab !== 'events' && tab !== 'pracas') || isAdmin) && (
              <button key={tab} onClick={() => setCurrentTab(tab)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTab === tab ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-white'}`}>
                {tab === 'events' ? 'Eventos' : tab === 'pracas' ? 'Praças' : tab}
              </button>
            )
          ))}
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-gray-300">{currentUser?.nome}</p>
            <p className="text-[8px] font-bold uppercase text-gray-500">{currentUser?.cargo} ({currentUser?.role})</p>
          </div>
          <button onClick={() => setCurrentUser(null)} className="text-[10px] font-black uppercase text-rose-500 border border-rose-900/30 px-6 py-3 rounded-2xl hover:bg-rose-900/10 transition-all">Sair</button>
        </div>
      </nav>

      {currentTab !== 'pracas' && (
        <div className="flex flex-wrap gap-4 mb-12 bg-[#111] p-6 rounded-[2.5rem] border border-[#222] items-center">
          <div className="flex flex-col gap-2">
            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-4">Território (Praça)</label>
            <select value={selectedPraca} onChange={e => { setSelectedPraca(e.target.value); setSelectedExecutive('todos'); }} className="bg-[#1a1a1a] border border-[#333] text-[10px] font-black uppercase px-6 py-3 rounded-2xl outline-none text-white focus:border-white transition-all">
              <option value="todas">Todas as Praças</option>
              {(pracas ?? []).filter(p => p?.ativo).map(p => <option key={p.pracaId} value={p.pracaId}>{p.nome} ({p.uf})</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-4">Executivo Comercial</label>
            <select value={selectedExecutive} onChange={e => setSelectedExecutive(e.target.value)} className="bg-[#1a1a1a] border border-[#333] text-[10px] font-black uppercase px-6 py-3 rounded-2xl outline-none text-white focus:border-white transition-all">
              <option value="todos">Todos os Executivos</option>
              {(executivesInPraca ?? []).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          
          <div className="ml-auto text-right">
            <p className="text-[9px] font-black text-gray-600 uppercase mb-1">Total Filtrado</p>
            <p className="text-xl font-black italic text-white">{currencyFormatter.format(stats.totalProposedValue)}</p>
          </div>
        </div>
      )}

      {currentTab === 'dashboard' && <Dashboard stats={stats} />}

      {currentTab === 'pracas' && isAdmin && (
        <PracaManagement 
          pracas={pracas} 
          onAddPraca={handleAddPraca} 
          onRemovePraca={handleRemovePraca} 
        />
      )}

      {currentTab === 'events' && isAdmin && (
        <EventManagement 
          events={filteredEvents} 
          pracas={pracas}
          onAddEvent={e => setEvents([...(events ?? []), e])}
          onUpdateEvent={e => setEvents((events ?? []).map(ev => ev.eventId === e.eventId ? e : ev))}
          onRemoveEvent={id => setEvents((events ?? []).filter(ev => ev.eventId !== id))}
        />
      )}

      {currentTab === 'proposals' && (
        <div className="animate-in fade-in duration-700">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-5xl font-black italic tracking-tighter uppercase mb-2">Propostas</h2>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Negociações por {selectedPraca === 'todas' ? 'Território' : (pracas ?? []).find(p => p.pracaId === selectedPraca)?.nome}</p>
            </div>
            <button onClick={() => { setEditingProposal(null); setIsFormOpen(true); }} className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all">Nova Proposta</button>
          </div>

          <div className="bg-[#1a1a1a] rounded-[3rem] border border-[#222] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#111]">
                <tr className="text-[9px] font-black text-gray-600 uppercase tracking-widest border-b border-[#222]">
                  <th className="px-10 py-6">Praça / Empresa</th>
                  <th className="px-10 py-6">Status</th>
                  <th className="px-10 py-6">Responsável</th>
                  <th className="px-10 py-6">Vagas</th>
                  <th className="px-10 py-6">Valor Total</th>
                  <th className="px-10 py-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredProposals.map(p => {
                  if (!p) return null;
                  const exec = (users ?? []).find(u => u.id === p.ownerUserId);
                  const praca = (pracas ?? []).find(pr => pr.pracaId === p.pracaId);
                  const totalSlots = (p.packageItems ?? []).reduce((acc, pi) => acc + (pi?.quantidadeVagas ?? 0), 0);
                  const totalVal = (p.packageItems ?? []).reduce((acc, pi) => acc + ((pi?.quantidadeVagas ?? 0) * (pi?.valorUnitario ?? 0)), 0);
                  return (
                    <tr key={p.id} className="hover:bg-[#151515] transition-colors">
                      <td className="px-10 py-8">
                        <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">{praca?.nome || p.pracaId}</p>
                        <p className="text-lg font-black text-white italic uppercase tracking-tighter">{p.company}</p>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-[10px] font-black uppercase text-gray-300">{exec?.nome || 'Não definido'}</p>
                      </td>
                      <td className="px-10 py-8 font-black text-xs text-white">{totalSlots}</td>
                      <td className="px-10 py-8 font-black text-xs text-white">{currencyFormatter.format(totalVal)}</td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => { setEditingProposal(p); setIsFormOpen(true); }} className="p-3 text-white border border-[#333] rounded-2xl hover:bg-[#333] transition-all">Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentTab === 'import' && (
        <ImportExport 
          currentUser={currentUser!} 
          onImport={setProposals} 
          allProposals={proposals} 
          usersList={users} 
          onNotify={showFeedback}
          autoCalculate={true}
        />
      )}

      {currentTab === 'users' && isAdmin && (
        <UserManagement 
          users={users} 
          pracas={pracas}
          onAddUser={u => setUsers([...(users ?? []), u])} 
          onUpdateUser={u => setUsers((users ?? []).map(us => us.id === u.id ? u : us))}
          onRemoveUser={id => setUsers((users ?? []).filter(us => us.id !== id))}
          onUpdateProfile={(id, p) => setUsers((users ?? []).map(u => u.id === id ? { ...u, role: p as any } : u))}
          onAddPraca={handleAddPraca}
          onUpdatePraca={handleUpdatePraca}
          onRemovePraca={handleRemovePraca}
        />
      )}

      <ProposalForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSubmit={p => {
          if (editingProposal) setProposals((proposals ?? []).map(pr => pr.id === p.id ? p : pr));
          else setProposals([p, ...(proposals ?? [])]);
          setIsFormOpen(false);
        }}
        onQuickAddEvent={e => setEvents([...(events ?? []), e])}
        initialData={editingProposal}
        usersList={users}
        currentUser={currentUser!}
        autoCalculate={true}
        eventsList={events}
        pracasList={pracas}
      />
    </div>
  );
};

export default App;
