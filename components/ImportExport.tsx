
import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Proposal, ProposalStatus, ProposalType, User, ReservationStatus, PaymentMethod, WithdrawalType, ProposalModality, ProposalItem } from '../types';

interface ImportExportProps {
  currentUser: User;
  onImport: (proposals: Proposal[]) => void;
  allProposals: Proposal[];
  usersList: User[];
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
  autoCalculate: boolean;
}

type ImportStage = 'upload' | 'preview' | 'loading' | 'result';

interface ValidationError {
  row: number;
  column: string;
  reason: string;
}

interface CorrectionLog {
  row: number;
  column: string;
  original: any;
  corrected: any;
  reason: string;
}

interface ImportSummary {
  totalAnalyzed: number;
  newProposals: number;
  updatedProposals: number;
  totalItems: number;
  correctionsCount: number;
  errorsCount: number;
  status: 'success' | 'partial' | 'error';
  message: string;
}

const EVENT_TAB_COLUMNS = [
  'Evento', 'Cidade / Praça', 'Sigla da Praça', 'Valor por inscrição', 'Quant. Vagas', 'Valor Total', 'Observações'
];

const OFFICIAL_ORDER = [
  'Empresa', 'Responsável', 'E-mail', 'Telefone', 'Tipo Grupo', 'Cidade / Praça', 'Evento', 
  'Tipo de Proposta', 'Valor unitário por inscrição', 'Valor Proposto', 'Quant. Vagas', 'Status', 
  'Envio da Proposta', 'Data de Retorno', 'Último Contato', 'Reserva', 'Observações'
];

const ImportExport: React.FC<ImportExportProps> = ({ currentUser, onImport, allProposals, usersList, onNotify, autoCalculate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<ImportStage>('upload');
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [corrections, setCorrections] = useState<CorrectionLog[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const reset = () => {
    setStage('upload');
    setPendingProposals([]);
    setErrors([]);
    setCorrections([]);
    setSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([OFFICIAL_ORDER]);
    XLSX.utils.book_append_sheet(wb, ws, "PROPOSTAS");
    
    // Add the specific "Informações de Evento" tab requested
    const wsEvent = XLSX.utils.aoa_to_sheet([EVENT_TAB_COLUMNS]);
    XLSX.utils.book_append_sheet(wb, wsEvent, "Informações de Evento");
    
    XLSX.writeFile(wb, "CAZARI_IMPORT_TEMPLATE.xlsx");
    onNotify("Template oficial com aba de eventos baixado.", 'success');
  };

  const cleanNumeric = (val: any): number => {
    if (val === undefined || val === null || val === '') return NaN;
    if (typeof val === 'number') return val;
    const clean = String(val).replace('R$', '').replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return parsed;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        
        // Prioritize "Informações de Evento" tab as requested
        const targetSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('evento')) || wb.SheetNames[0];
        const ws = wb.Sheets[targetSheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        if (data.length < 1) throw new Error("A planilha está vazia.");

        const rawHeaders = data[0].map(h => String(h || '').trim());
        const rows = data.slice(1);
        
        // Map columns for the "Informações de Evento" logic
        const colMap: Record<string, number> = {};
        EVENT_TAB_COLUMNS.forEach(col => {
          const idx = rawHeaders.findIndex(h => h.toLowerCase().includes(col.toLowerCase()));
          if (idx !== -1) colMap[col] = idx;
        });

        const foundErrors: ValidationError[] = [];
        const foundCorrections: CorrectionLog[] = [];
        const tempProposals: Proposal[] = [];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2;
          const getValue = (col: string) => row[colMap[col]] ?? '';

          const eventName = String(getValue('Evento')).trim();
          if (!eventName && rows.length > 1) return; // Skip empty rows

          // 1. CORREÇÃO: Quant. Vagas
          const rawVagas = getValue('Quant. Vagas');
          const numVagas = cleanNumeric(rawVagas);
          let correctedVagas = 0;
          let vagasOk = true;

          if (isNaN(numVagas) || numVagas <= 0) {
            foundErrors.push({ row: rowNum, column: 'Quant. Vagas', reason: 'Quantidade de vagas inválida' });
            vagasOk = false;
          } else {
            correctedVagas = Math.floor(numVagas); // Arredondamento para baixo
            if (correctedVagas !== rawVagas) {
              foundCorrections.push({ 
                row: rowNum, 
                column: 'Quant. Vagas', 
                original: rawVagas, 
                corrected: correctedVagas, 
                reason: 'Conversão para inteiro/Arredondamento para baixo' 
              });
            }
          }

          // 2. CORREÇÃO: Valor por inscrição
          const rawUnit = getValue('Valor por inscrição');
          const numUnit = cleanNumeric(rawUnit);
          let correctedUnit = 0;
          let unitOk = true;

          if (isNaN(numUnit) || numUnit <= 0) {
            foundErrors.push({ row: rowNum, column: 'Valor por inscrição', reason: 'Valor por inscrição inválido' });
            unitOk = false;
          } else {
            correctedUnit = numUnit;
            if (numUnit !== rawUnit) {
              foundCorrections.push({ 
                row: rowNum, 
                column: 'Valor por inscrição', 
                original: rawUnit, 
                corrected: correctedUnit, 
                reason: 'Normalização de formato monetário' 
              });
            }
          }

          // 3. CORREÇÃO: Valor Total (Cálculo automático forçado)
          const rawTotal = getValue('Valor Total');
          const calculatedTotal = correctedVagas * correctedUnit;
          if (vagasOk && unitOk) {
            if (calculatedTotal !== cleanNumeric(rawTotal)) {
              foundCorrections.push({ 
                row: rowNum, 
                column: 'Valor Total', 
                original: rawTotal, 
                corrected: calculatedTotal, 
                reason: 'Recálculo automático (Vagas x Unitário)' 
              });
            }
          }

          if (vagasOk && unitOk && eventName) {
            // Create a virtual proposal for this event info row
            const pid = `EVENT-${Date.now()}-${idx}`;
            const item: ProposalItem = {
              id: `ITEM-${pid}`,
              proposalId: pid,
              event: eventName,
              city: String(getValue('Cidade / Praça')),
              sigla: String(getValue('Sigla da Praça')),
              unitValue: correctedUnit,
              totalValue: calculatedTotal,
              slots: correctedVagas,
              paymentDeadline: '',
              withdrawalType: WithdrawalType.Individual,
              observation: String(getValue('Observações'))
            };

            // Fix: Added required 'packageItems', 'ownerUserId', and 'pracaId' properties to the Proposal object to satisfy the TypeScript interface.
            tempProposals.push({
              id: pid,
              company: 'Importado via Info Evento',
              responsible: 'Automático',
              email: 'import@sistema.com',
              phone: '',
              groupType: 'Geral',
              type: ProposalType.Company,
              modality: ProposalModality.Individual,
              status: ProposalStatus.PrimeiraProposta,
              sentDate: new Date().toISOString().split('T')[0],
              returnDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // +1 day default
              lastContact: new Date().toISOString().split('T')[0],
              reservation: ReservationStatus.Nao,
              observations: 'Importação rápida de Informações de Evento',
              items: [item],
              responsibleExecutiveId: currentUser.id,
              ownerUserId: currentUser.id,
              pracaId: String(getValue('Sigla da Praça')) || currentUser.pracaPadraoId,
              uploadDeadline: '',
              reminderDays: 3,
              packageItems: []
            });
          }
        });

        setErrors(foundErrors);
        setCorrections(foundCorrections);
        setPendingProposals(tempProposals);
        setSummary({
          totalAnalyzed: rows.length,
          newProposals: tempProposals.length,
          updatedProposals: 0,
          totalItems: tempProposals.length,
          correctionsCount: foundCorrections.length,
          errorsCount: foundErrors.length,
          status: 'partial',
          message: `Análise da aba "${targetSheetName}" concluída.`
        });
        setStage('preview');
      } catch (err: any) {
        onNotify(err.message, 'error');
        reset();
      }
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = () => {
    setStage('loading');
    setTimeout(() => {
      const merged = [...allProposals, ...pendingProposals];
      onImport(merged);
      setSummary(prev => ({ ...prev!, status: 'success', message: 'Dados da aba de eventos importados com sucesso.' }));
      setStage('result');
      onNotify("Importação de eventos concluída.", 'success');
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      {stage === 'upload' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button onClick={downloadTemplate} className="group bg-[#1a1a1a] p-12 rounded-[3rem] border border-[#2a2a2a] text-center hover:border-white transition-all shadow-xl">
            <h3 className="text-sm font-black uppercase text-white tracking-widest">Baixar Template</h3>
            <p className="text-[9px] text-gray-500 mt-2 font-bold uppercase">Inclui aba "Informações de Evento"</p>
          </button>
          <label className="group bg-[#1a1a1a] p-12 rounded-[3rem] border-2 border-dashed border-[#333] text-center cursor-pointer hover:border-white transition-all shadow-xl">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx" />
            <h3 className="text-sm font-black uppercase text-white tracking-widest">Analisar Aba de Eventos</h3>
            <p className="text-[9px] text-gray-500 mt-2 font-bold uppercase">Correção automática e recálculo total</p>
          </label>
        </div>
      )}

      {stage === 'preview' && summary && (
        <div className="bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-10 shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black uppercase italic tracking-tighter">Relatório de Correção - Aba Eventos</h3>
            <button onClick={reset} className="text-[10px] font-black uppercase text-rose-500 hover:text-white transition-colors">Voltar</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-[#111] p-6 rounded-3xl border border-[#222]">
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Linhas Analisadas</p>
              <p className="text-2xl font-black text-white italic">{summary.totalAnalyzed}</p>
            </div>
            <div className="bg-[#111] p-6 rounded-3xl border border-[#222]">
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Correções Automáticas</p>
              <p className="text-2xl font-black text-amber-500 italic">{summary.correctionsCount}</p>
            </div>
            <div className="bg-[#111] p-6 rounded-3xl border border-[#222]">
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Linhas com Erro</p>
              <p className={`text-2xl font-black italic ${summary.errorsCount > 0 ? 'text-rose-500' : 'text-gray-600'}`}>{summary.errorsCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Correções (Vagas / Valores / Recálculos)</h4>
              <div className="bg-[#111] rounded-2xl border border-[#222] max-h-64 overflow-y-auto custom-scrollbar p-4 space-y-2">
                {corrections.length === 0 ? <p className="text-[10px] text-gray-600 uppercase">Nenhuma correção automática necessária.</p> : 
                  corrections.map((c, i) => (
                    <div key={i} className="text-[10px] text-gray-400 font-medium">
                      L{c.row} <span className="text-white">[{c.column}]</span>: <span className="line-through opacity-50">{c.original}</span> → <span className="text-amber-400">{c.corrected}</span>
                      <br/><span className="text-[8px] opacity-70 italic">{c.reason}</span>
                    </div>
                  ))
                }
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Erros Críticos (Impedem Importação)</h4>
              <div className="bg-[#111] rounded-2xl border border-[#222] max-h-64 overflow-y-auto custom-scrollbar p-4 space-y-2">
                {errors.length === 0 ? <p className="text-[10px] text-emerald-500 uppercase">Nenhum erro detectado nas lines de evento.</p> : 
                  errors.map((e, i) => (
                    <div key={i} className="text-[10px] text-rose-300 font-bold">
                      Linha {e.row} <span className="text-white">[{e.column}]</span>: {e.reason}
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-8 border-t border-[#222]">
            <button 
              disabled={pendingProposals.length === 0} 
              onClick={confirmImport} 
              className="bg-white text-black px-16 py-5 rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-30 hover:scale-105 transition-all shadow-xl"
            >
              Confirmar Importação de Eventos ({pendingProposals.length})
            </button>
          </div>
        </div>
      )}

      {stage === 'loading' && (
        <div className="py-32 text-center animate-pulse">
           <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-10"></div>
           <p className="text-sm font-black uppercase text-white tracking-[0.3em]">Integrando Dados Corrigidos...</p>
        </div>
      )}

      {stage === 'result' && summary && (
        <div className="bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-20 text-center shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-10 text-emerald-500">
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-4xl font-black uppercase italic mb-4 tracking-tighter">Correção Concluída</h3>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-12">Planilha analisada e propostas geradas com valores auditados.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-sm mx-auto mb-12">
            <div className="bg-[#111] p-6 rounded-3xl border border-[#222]">
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Novas Propostas</p>
              <p className="text-2xl font-black text-emerald-400 italic">{summary.newProposals}</p>
            </div>
            <div className="bg-[#111] p-6 rounded-3xl border border-[#222]">
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Itens de Evento</p>
              <p className="text-2xl font-black text-white italic">{summary.totalItems}</p>
            </div>
          </div>

          <button onClick={reset} className="bg-white text-black px-24 py-6 rounded-2xl font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl">Voltar ao Início</button>
        </div>
      )}
    </div>
  );
};

export default ImportExport;
