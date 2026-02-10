
import React, { useState } from 'react';
import { Event, Praca } from '../types';

interface EventManagementProps {
  events: Event[];
  pracas: Praca[];
  onAddEvent: (event: Event) => void;
  onUpdateEvent: (event: Event) => void;
  onRemoveEvent: (id: string) => void;
}

const EventManagement: React.FC<EventManagementProps> = ({ events, pracas, onAddEvent, onUpdateEvent, onRemoveEvent }) => {
  const [isEditing, setIsEditing] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    nomeEvento: '', cidade: '', uf: '', pracaId: '', dataEvento: '', local: '', distancias: '', horarioLargada: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      onUpdateEvent({ ...isEditing, updatedAt: new Date().toISOString() });
      setIsEditing(null);
    } else {
      if (!newEvent.pracaId) return alert("Selecione uma Praça.");
      onAddEvent({ 
        ...newEvent, 
        eventId: `EVT-${Date.now()}`, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      } as Event);
      setNewEvent({ nomeEvento: '', cidade: '', uf: '', pracaId: '', dataEvento: '', local: '', distancias: '', horarioLargada: '' });
    }
  };

  const inputClass = "w-full px-5 py-4 rounded-2xl border border-[#333] bg-[#1a1a1a] text-white focus:ring-2 focus:ring-white outline-none text-sm font-semibold transition-all";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="bg-[#1a1a1a] p-10 rounded-[3rem] border border-[#2a2a2a] shadow-2xl h-fit">
        <h3 className="text-2xl font-black text-white mb-10 uppercase italic tracking-tighter">{isEditing ? 'Editar Evento' : 'Novo Evento'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Nome do Evento" value={isEditing ? isEditing.nomeEvento : newEvent.nomeEvento} onChange={e => isEditing ? setIsEditing({...isEditing, nomeEvento: e.target.value}) : setNewEvent({...newEvent, nomeEvento: e.target.value})} className={inputClass} />
          
          <div>
            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Praça Vinculada *</label>
            <select required value={isEditing ? isEditing.pracaId : newEvent.pracaId} onChange={e => isEditing ? setIsEditing({...isEditing, pracaId: e.target.value}) : setNewEvent({...newEvent, pracaId: e.target.value})} className={inputClass}>
              <option value="" disabled>Selecione a Praça</option>
              {pracas.map(p => <option key={p.pracaId} value={p.pracaId}>{p.nome}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><input required placeholder="Cidade" value={isEditing ? isEditing.cidade : newEvent.cidade} onChange={e => isEditing ? setIsEditing({...isEditing, cidade: e.target.value}) : setNewEvent({...newEvent, cidade: e.target.value})} className={inputClass} /></div>
            <input required placeholder="UF" maxLength={2} value={isEditing ? isEditing.uf : newEvent.uf} onChange={e => isEditing ? setIsEditing({...isEditing, uf: e.target.value.toUpperCase()}) : setNewEvent({...newEvent, uf: e.target.value.toUpperCase()})} className={inputClass} />
          </div>
          <input required type="date" value={isEditing ? isEditing.dataEvento : newEvent.dataEvento} onChange={e => isEditing ? setIsEditing({...isEditing, dataEvento: e.target.value}) : setNewEvent({...newEvent, dataEvento: e.target.value})} className={inputClass} />
          
          <button type="submit" className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl mt-4">{isEditing ? 'Salvar' : 'Criar'}</button>
          {isEditing && <button type="button" onClick={() => setIsEditing(null)} className="w-full py-2 text-[9px] font-black uppercase text-gray-500">Cancelar</button>}
        </form>
      </div>

      <div className="lg:col-span-2 bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] overflow-hidden shadow-2xl">
        <table className="min-w-full divide-y divide-[#2a2a2a]">
          <thead className="bg-[#222]"><tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest"><th className="px-10 py-6 text-left">Evento / Praça</th><th className="px-10 py-6 text-left">Localização</th><th className="px-10 py-6 text-right">Ações</th></tr></thead>
          <tbody className="divide-y divide-[#2a2a2a]">
            {events.map(evt => {
              const praca = pracas.find(p => p.pracaId === evt.pracaId);
              return (
                <tr key={evt.eventId} className="hover:bg-[#222]">
                  <td className="px-10 py-8">
                    <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">{praca?.nome || evt.pracaId}</p>
                    <p className="text-lg font-black text-white uppercase italic">{evt.nomeEvento}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-xs font-bold text-gray-400">{evt.cidade} - {evt.uf}</p>
                    <p className="text-[9px] text-gray-600 font-bold uppercase">{evt.dataEvento.split('-').reverse().join('/')}</p>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button onClick={() => setIsEditing(evt)} className="p-3 text-white border border-[#333] rounded-2xl hover:bg-[#333]">Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventManagement;
