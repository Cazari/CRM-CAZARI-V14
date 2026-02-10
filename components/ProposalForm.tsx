
import React, { useState, useEffect, useMemo } from 'react';
import { Proposal, ProposalStatus, ProposalType, ReservationStatus, User, UserRole, PaymentMethod, WithdrawalType, ProposalModality, Event, ProposalPackageItem, Praca } from '../types';

interface ProposalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (proposal: Proposal) => void;
  initialData?: Proposal | null;
  usersList: User[];
  currentUser: User;
  autoCalculate: boolean;
  eventsList: Event[];
  pracasList: Praca[];
  onQuickAddEvent: (event: Event) => void;
}

const ProposalForm: React.FC<ProposalFormProps> = ({ isOpen, onClose, onSubmit, initialData, usersList, currentUser, autoCalculate, eventsList, pracasList, onQuickAddEvent }) => {
  const [formData, setFormData] = useState<Partial<Proposal>>({});
  const [packageItems, setPackageItems] = useState<ProposalPackageItem[]>([]);
  const [activeSection, setActiveSection] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [quickEvent, setQuickEvent] = useState<Partial<Event>>({ nomeEvento: '', cidade: '', uf: '', dataEvento: '', pracaId: '' });

  const currencyFormatter = useMemo(() => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  // Praça bloqueada pela proposta ou pelo primeiro evento do pacote
  const lockedPracaId = useMemo(() => {
    if (packageItems.length > 0) {
      const firstEvt = eventsList.find(e => e.eventId === packageItems[0].eventId);
      return firstEvt?.pracaId;
    }
    return formData.pracaId;
  }, [packageItems, eventsList, formData.pracaId]);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
      setPackageItems(Array.isArray(initialData.packageItems) ? initialData.packageItems.map(pi => ({ ...pi })) : []);
    } else {
      setFormData({
        id: `PROP-${Date.now()}`,
        status: ProposalStatus.PrimeiraProposta,
        reservation: ReservationStatus.Nao,
        type: ProposalType.Company,
        modality: ProposalModality.Individual,
        sentDate: new Date().toISOString().split('T')[0],
        returnDate: '',
        lastContact: new Date().toISOString().split('T')[0],
        reminderDays: 3,
        ownerUserId: currentUser.id,
        responsibleExecutiveId: currentUser.id, // Legado
        pracaId: currentUser.pracaPadraoId,
        observations: '',
        retiradaKit: WithdrawalType.Individual,
        formaPagamento: PaymentMethod.Boleto,
      });
      setPackageItems([]);
    }
    setErrors({});
    setActiveSection(1);
    setIsAddingEvent(false);
  }, [initialData, isOpen, currentUser]);

  const addEventToPackage = (eventId: string) => {
    if (packageItems.find(pi => pi.eventId === eventId)) return;
    const evt = eventsList.find(e => e.eventId === eventId);
    if (!evt) return;

    // Regra de Praça: Se já tem itens, o novo deve ser da mesma praça
    if (packageItems.length > 0) {
      const firstEvt = eventsList.find(e => e.eventId === packageItems[0].eventId);
      if (firstEvt && firstEvt.pracaId !== evt.pracaId) {
        alert(`Erro: Este evento pertence a praça ${evt.pracaId}. Propostas pacote devem conter apenas eventos da mesma praça (${firstEvt.pracaId}).`);
        return;
      }
    }

    setPackageItems([...packageItems, { 
      eventId, 
      quantidadeVagas: 0, 
      valorUnitario: 0, 
      dataLimiteInscricao: '', 
      dataLimitePagamento: '' 
    }]);
    
    // Atualiza a praça da proposta se for o primeiro item
    if (packageItems.length === 0) {
      setFormData(prev => ({ ...prev, pracaId: evt.pracaId }));
    }
  };

  const updatePackageItem = (eventId: string, field: keyof ProposalPackageItem, value: any) => {
    setPackageItems(packageItems.map(pi => pi.eventId === eventId ? { ...pi, [field]: value } : pi));
  };

  const handleQuickAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEvent.pracaId) return;
    const newEvt: Event = {
      ...quickEvent,
      eventId: `EVT-QUICK-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Event;
    onQuickAddEvent(newEvt);
    addEventToPackage(newEvt.eventId);
    setIsAddingEvent(false);
    setQuickEvent({ nomeEvento: '', cidade: '', uf: '', dataEvento: '', pracaId: '' });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.company) e.company = "Obrigatório";
    if (!formData.returnDate) e.returnDate = "Data de retorno obrigatória";
    if (packageItems.length === 0) e.packageItems = "Selecione ao menos um evento";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-5 py-4 rounded-2xl border border-[#333] bg-[#1a1a1a] text-white outline-none focus:ring-2 focus:ring-white transition-all font-bold text-sm disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] rounded-[3rem] w-full max-w-7xl shadow-2xl overflow-hidden border border-[#2a2a2a] animate-in zoom-in-95 relative">
        
        {isAddingEvent && (
          <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="bg-[#111] border border-[#333] p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-90">
              <h3 className="text-xl font-black uppercase text-white mb-8 italic tracking-tighter">Cadastro Rápido de Evento</h3>
              <form onSubmit={handleQuickAddEventSubmit} className="space-y-4">
                <input required placeholder="Nome do Evento" value={quickEvent.nomeEvento || ''} onChange={e => setQuickEvent({...quickEvent, nomeEvento: e.target.value})} className={inputClass} />
                <select required value={quickEvent.pracaId || ''} onChange={e => setQuickEvent({...quickEvent, pracaId: e.target.value})} className={inputClass}>
                  <option value="" disabled>Selecione a Praça do Evento</option>
                  {pracasList.map(p => <option key={p.pracaId} value={p.pracaId}>{p.nome}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="Cidade" value={quickEvent.cidade || ''} onChange={e => setQuickEvent({...quickEvent, cidade: e.target.value})} className={inputClass} />
                  <input required placeholder="UF" maxLength={2} value={quickEvent.uf || ''} onChange={e => setQuickEvent({...quickEvent, uf: e.target.value.toUpperCase()})} className={inputClass} />
                </div>
                <input required type="date" value={quickEvent.dataEvento || ''} onChange={e => setQuickEvent({...quickEvent, dataEvento: e.target.value})} className={inputClass} />
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsAddingEvent(false)} className="flex-1 py-4 text-gray-500 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest">Salvar Evento</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-[#111] px-10 py-8 border-b border-[#222] flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Gestão de Proposta</h2>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Território: {pracasList.find(p => p.pracaId === formData.pracaId)?.nome || 'Não definido'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#222] rounded-xl text-gray-500">Fechar</button>
        </div>

        <div className="flex flex-col md:flex-row h-[75vh]">
          <div className="w-full md:w-64 bg-[#111] border-r border-[#222] p-6 space-y-4">
            {[1, 2].map(s => (
              <button key={s} onClick={() => setActiveSection(s)} className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === s ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-500 hover:bg-[#222]'}`}>
                {s === 1 ? 'Pacote e Financeiro' : 'Dados Comerciais'}
              </button>
            ))}
          </div>

          <div className="flex-1 p-12 overflow-y-auto custom-scrollbar bg-[#1a1a1a]">
            {activeSection === 1 && <div className="space-y-8 animate-in fade-in duration-500">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Adicionar Eventos da Praça *</label>
                  <button type="button" onClick={() => setIsAddingEvent(true)} className="text-[9px] font-black uppercase text-emerald-500">+ Novo Evento</button>
                </div>
                
                <select onChange={e => addEventToPackage(e.target.value)} className={inputClass} value="">
                  <option value="" disabled>Selecione um evento da praça {lockedPracaId}...</option>
                  {eventsList
                    .filter(evt => !lockedPracaId || evt.pracaId === lockedPracaId)
                    .map(evt => (
                    <option key={evt.eventId} value={evt.eventId} disabled={packageItems.some(pi => pi.eventId === evt.eventId)}>
                      {evt.nomeEvento} ({evt.dataEvento.split('-').reverse().join('/')})
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-1 gap-6 mt-8">
                  {packageItems.map(pi => {
                    const evt = eventsList.find(e => e.eventId === pi.eventId);
                    return (
                      <div key={pi.eventId} className="p-8 bg-[#222] rounded-[3rem] border border-[#333] relative">
                        <button type="button" onClick={() => {
                          const newList = packageItems.filter(item => item.eventId !== pi.eventId);
                          setPackageItems(newList);
                          if (newList.length === 0) setFormData(prev => ({...prev, pracaId: currentUser.pracaPadraoId}));
                        }} className="absolute top-6 right-8 text-rose-500 font-black uppercase text-[10px]">Remover</button>
                        <p className="text-xl font-black text-white uppercase italic leading-tight tracking-tighter mb-6">{evt?.nomeEvento || 'Evento'}</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div>
                            <label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Vagas</label>
                            <input type="number" min="0" value={pi.quantidadeVagas} onChange={e => updatePackageItem(pi.eventId, 'quantidadeVagas', parseInt(e.target.value) || 0)} className={inputClass} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Valor Unit.</label>
                            <input type="number" step="0.01" value={pi.valorUnitario} onChange={e => updatePackageItem(pi.eventId, 'valorUnitario', parseFloat(e.target.value) || 0)} className={inputClass} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Limite Inscrição</label>
                            <input type="date" value={pi.dataLimiteInscricao} onChange={e => updatePackageItem(pi.eventId, 'dataLimiteInscricao', e.target.value)} className={inputClass} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Limite Pagamento</label>
                            <input type="date" value={pi.dataLimitePagamento} onChange={e => updatePackageItem(pi.eventId, 'dataLimitePagamento', e.target.value)} className={inputClass} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>}

            {activeSection === 2 && <div className="space-y-12 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 gap-8">
                <div><label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Empresa *</label><input value={formData.company || ''} onChange={e => setFormData({...formData, company: e.target.value})} className={inputClass} /></div>
                <div><label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Executivo Responsável</label>
                  <select value={formData.ownerUserId} onChange={e => setFormData({...formData, ownerUserId: e.target.value})} className={inputClass}>
                    {usersList.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div><label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProposalStatus})} className={inputClass}>
                    {Object.values(ProposalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Data de Retorno *</label><input type="date" value={formData.returnDate || ''} onChange={e => setFormData({...formData, returnDate: e.target.value})} className={inputClass} /></div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div><label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Praça (Território)</label>
                  <select disabled={packageItems.length > 0} value={formData.pracaId} onChange={e => setFormData({...formData, pracaId: e.target.value})} className={inputClass}>
                    {pracasList.map(p => <option key={p.pracaId} value={p.pracaId}>{p.nome}</option>)}
                  </select>
                </div>
                <div><label className="text-[9px] font-black text-gray-500 uppercase mb-2 block">Forma Pagamento</label>
                  <select value={formData.formaPagamento} onChange={e => setFormData({...formData, formaPagamento: e.target.value as PaymentMethod})} className={inputClass}>
                    {Object.values(PaymentMethod).map(pm => <option key={pm} value={pm}>{pm}</option>)}
                  </select>
                </div>
              </div>
            </div>}
          </div>
        </div>

        <div className="bg-[#111] px-12 py-8 border-t border-[#222] flex justify-end gap-6 items-center">
          <button onClick={onClose} className="px-8 py-3 text-gray-600 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">Cancelar</button>
          <button onClick={() => validate() && onSubmit({...formData, packageItems, items: []} as Proposal)} className="bg-white text-black px-14 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl tracking-widest hover:scale-105 transition-all">Salvar Proposta</button>
        </div>
      </div>
    </div>
  );
};

export default ProposalForm;
