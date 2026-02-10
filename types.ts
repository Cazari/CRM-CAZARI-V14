
export enum ProposalStatus {
  PrimeiraProposta = 'Primeira proposta',
  Pendente = 'Pendente',
  EmAndamento = 'Em Andamento',
  Negativa = 'Negativa',
  Concluida = 'Concluída'
}

export enum ProposalType {
  Company = 'Company',
  Individual = 'Individual',
  Patrocinio = 'Patrocínio'
}

export enum ProposalModality {
  Individual = 'Individual',
  Pacote = 'Pacote'
}

export enum ReservationStatus {
  Sim = 'Sim',
  Nao = 'Não',
  Parcial = 'Parcial'
}

export enum PaymentMethod {
  Boleto = 'Boleto',
  Pix = 'Pix',
  Cartao = 'Cartão',
  Faturado = 'Faturado',
  Parcelado = 'Parcelado'
}

export enum WithdrawalType {
  Individual = 'Individual',
  Grupo = 'Grupo'
}

export enum UserRole {
  Admin = 'admin',
  Manager = 'manager',
  Exec = 'exec',
  Viewer = 'viewer'
}

// Perfil legado para compatibilidade de UI se necessário
export enum UserProfile {
  AdminMaster = 'Admin Master',
  Comercial = 'Comercial'
}

export interface Praca {
  pracaId: string;
  nome: string;
  uf?: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string; // userId único
  nome: string;
  email: string;
  password?: string;
  telefone?: string;
  cargo: string;
  role: UserRole;
  pracaIds: string[]; // IDs das praças atendidas (separadas por ;)
  pracaPadraoId: string;
  active: boolean;
  profile?: UserProfile; // Legado
  cities?: string[]; // Legado
  groupTypes?: string[]; // Legado
  createdAt: string;
  updatedAt: string;
}

export interface ProfileAuditLog {
  id: string;
  targetUserId: string;
  targetUserName: string;
  adminId: string;
  adminName: string;
  oldProfile: string;
  newProfile: string;
  timestamp: string;
}

export interface ActionLog {
  userId: string;
  userName: string;
  action: 'Criou' | 'Editou' | 'Excluiu' | 'Duplicou';
  timestamp: string;
}

export interface ProposalItem {
  id: string;
  proposalId: string;
  event: string;
  city: string;
  sigla: string;
  unitValue: number;
  totalValue: number; 
  slots: number;
  paymentDeadline: string;
  withdrawalType: WithdrawalType;
  observation: string;
}

export interface AppSettings {
  autoCalculateTotal: boolean;
}

export interface Event {
  eventId: string;
  nomeEvento: string;
  cidade: string;
  uf: string;
  pracaId: string; // Vínculo obrigatório com Praça
  dataEvento: string;
  local: string;
  distancias: string;
  horarioLargada: string;
  linkOficial?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalPackageItem {
  eventId: string;
  quantidadeVagas: number;
  valorUnitario: number;
  dataLimiteInscricao: string;
  dataLimitePagamento: string;
}

export interface Proposal {
  id: string;
  company: string;
  responsible: string;
  email: string;
  phone: string;
  groupType: string;
  type: ProposalType;
  modality: ProposalModality;
  status: ProposalStatus;
  sentDate: string;
  returnDate: string; 
  lastContact: string;
  reservation: ReservationStatus;
  observations: string;
  items: ProposalItem[];
  paymentMethod?: PaymentMethod;
  withdrawalType?: WithdrawalType;
  responsibleExecutiveId: string; // Legado
  ownerUserId: string; // Referência a users.id
  pracaId: string; // Praça da proposta
  uploadDeadline: string;
  reminderDays: number;
  createdBy?: ActionLog;
  updatedBy?: ActionLog[];
  
  formaPagamento?: PaymentMethod;
  retiradaKit?: WithdrawalType;

  packageItems: ProposalPackageItem[];
}

export interface DashboardStats {
  totalCount: number;
  byStatus: Record<ProposalStatus, number>;
  totalValue: number;
  totalSlots: number;
  followUpsToday: number;
  followUpsDelayed: number;
  sentCount: number;
  approvedCount: number;
  totalProposedValue: number;
  totalApprovedValue: number;
}
