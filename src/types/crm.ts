import type { RecordModel } from 'pocketbase'

export type UserRole = 'vendedor' | 'gestor'

export interface AppUser extends RecordModel {
  email: string
  name: string
  avatar?: string
  role: UserRole
  verified: boolean
}

export type DealStage = 'lead' | 'contato-feito' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'

export interface Deal extends RecordModel {
  title: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  value: number
  stage: DealStage
  owner: string
  expected_close_date?: string
  notes?: string
  expand?: {
    owner?: AppUser
  }
}

export type ActivityType = 'chamada' | 'email' | 'reuniao' | 'nota'

export interface Activity extends RecordModel {
  deal: string
  type: ActivityType
  description: string
  done: boolean
  due_date?: string
  created_by: string
  expand?: {
    deal?: Deal
    created_by?: AppUser
  }
}

export interface ImportAudit extends RecordModel {
  filename: string
  rows_total: number
  rows_imported: number
  rows_failed: number
  imported_by: string
  expand?: {
    imported_by?: AppUser
  }
}

export interface StageConfig {
  id: DealStage
  label: string
  color: string
  bgLight: string
  borderColor: string
  badgeBg: string
  badgeText: string
  accentColor: string
}

export const STAGES: StageConfig[] = [
  {
    id: 'lead',
    label: 'Lead',
    color: '#64748B',
    bgLight: 'bg-slate-50/80',
    borderColor: 'border-slate-200',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    accentColor: '#64748B',
  },
  {
    id: 'contato-feito',
    label: 'Contato Feito',
    color: '#6366F1',
    bgLight: 'bg-indigo-50/70',
    borderColor: 'border-indigo-200',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
    accentColor: '#6366F1',
  },
  {
    id: 'proposta',
    label: 'Proposta Enviada',
    color: '#E8A020',
    bgLight: 'bg-amber-50/70',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    accentColor: '#E8A020',
  },
  {
    id: 'negociacao',
    label: 'Negociação',
    color: '#EA7A3B',
    bgLight: 'bg-orange-50/70',
    borderColor: 'border-orange-200',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    accentColor: '#EA7A3B',
  },
  {
    id: 'ganho',
    label: 'Ganho',
    color: '#2E9E8F',
    bgLight: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    accentColor: '#2E9E8F',
  },
  {
    id: 'perdido',
    label: 'Perdido',
    color: '#9CA3AF',
    bgLight: 'bg-neutral-100/70',
    borderColor: 'border-neutral-200',
    badgeBg: 'bg-neutral-200',
    badgeText: 'text-neutral-700',
    accentColor: '#9CA3AF',
  },
]

export const STAGE_MAP: Record<DealStage, StageConfig> = STAGES.reduce(
  (acc, stage) => {
    acc[stage.id] = stage
    return acc
  },
  {} as Record<DealStage, StageConfig>,
)

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: string; badgeClass: string }
> = {
  chamada: {
    label: 'Chamada',
    icon: 'Phone',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  email: {
    label: 'E-mail',
    icon: 'Mail',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  reuniao: {
    label: 'Reunião',
    icon: 'Calendar',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  nota: {
    label: 'Nota',
    icon: 'FileText',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
  },
}
