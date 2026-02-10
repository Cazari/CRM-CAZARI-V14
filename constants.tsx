
import { ProposalStatus, User, UserRole, UserProfile, Praca } from './types';

export const STATUS_COLORS: Record<ProposalStatus, string> = {
  [ProposalStatus.PrimeiraProposta]: 'bg-purple-900/40 text-purple-200 border-purple-800',
  [ProposalStatus.Pendente]: 'bg-amber-900/40 text-amber-200 border-amber-800',
  [ProposalStatus.EmAndamento]: 'bg-blue-900/40 text-blue-200 border-blue-800',
  [ProposalStatus.Negativa]: 'bg-rose-900/40 text-rose-200 border-rose-800',
  [ProposalStatus.Concluida]: 'bg-emerald-900/40 text-emerald-200 border-emerald-800',
};

export const INITIAL_PRACAS: Praca[] = [
  { pracaId: 'BH', nome: 'Belo Horizonte', uf: 'MG', ativo: true },
  { pracaId: 'BSB', nome: 'Brasília', uf: 'DF', ativo: true },
  { pracaId: 'SSA', nome: 'Salvador', uf: 'BA', ativo: true },
  { pracaId: 'REC', nome: 'Recife', uf: 'PE', ativo: true },
  { pracaId: 'SP', nome: 'São Paulo', uf: 'AS', ativo: true },
];

export const INITIAL_USERS: User[] = [
  {
    id: '1',
    nome: 'Admin Master',
    email: 'admin@cazari.com.br',
    password: 'admin',
    cargo: 'Administrador do Sistema',
    role: UserRole.Admin,
    pracaIds: ['BH', 'BSB', 'SSA', 'REC', 'SP'],
    pracaPadraoId: 'BH',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: UserProfile.AdminMaster
  },
  {
    id: '2',
    nome: 'Cazari Master',
    email: '@Cazari',
    password: '123456',
    cargo: 'Coordenador Comercial',
    role: UserRole.Admin,
    pracaIds: ['BH', 'BSB', 'SSA', 'REC', 'SP'],
    pracaPadraoId: 'BH',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: UserProfile.AdminMaster
  }
];

export const MOCK_DATA = [];
