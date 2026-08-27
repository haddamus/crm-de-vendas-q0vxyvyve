import pb from '@/lib/pocketbase/client'
import type { Deal, Activity, ImportAudit, AppUser } from '@/types/crm'

// Helper for currency formatting
export function formatBRL(value: number | undefined | null): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

// Helper for compact currency formatting (e.g., R$ 45k)
export function formatBRLCompact(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`
  }
  return formatBRL(value)
}

// Helper for date formatting (DD/MM/YYYY)
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  } catch {
    return dateStr
  }
}

// ==================== DEALS SERVICE ====================
export async function getDeals(filter?: string): Promise<Deal[]> {
  return pb.collection('deals').getFullList<Deal>({
    sort: '-created',
    filter: filter || '',
    expand: 'owner',
  })
}

export async function getDealById(id: string): Promise<Deal> {
  return pb.collection('deals').getOne<Deal>(id, {
    expand: 'owner',
  })
}

export async function createDeal(data: {
  title: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  value: number
  stage: string
  owner: string
  expected_close_date?: string
  notes?: string
}): Promise<Deal> {
  return pb.collection('deals').create<Deal>(data, {
    expand: 'owner',
  })
}

export async function updateDeal(
  id: string,
  data: Partial<{
    title: string
    customer_name: string
    customer_email?: string
    customer_phone?: string
    value: number
    stage: string
    owner: string
    expected_close_date?: string
    notes?: string
  }>,
): Promise<Deal> {
  return pb.collection('deals').update<Deal>(id, data, {
    expand: 'owner',
  })
}

export async function deleteDeal(id: string): Promise<boolean> {
  return pb.collection('deals').delete(id)
}

// ==================== ACTIVITIES SERVICE ====================
export async function getActivities(dealId?: string): Promise<Activity[]> {
  const filter = dealId ? `deal = "${dealId}"` : ''
  return pb.collection('activities').getFullList<Activity>({
    sort: '-created',
    filter,
    expand: 'deal,created_by',
  })
}

export async function getRecentActivities(limit: number = 10): Promise<Activity[]> {
  return pb
    .collection('activities')
    .getList<Activity>(1, limit, {
      sort: '-created',
      expand: 'deal,created_by',
    })
    .then((res) => res.items)
}

export async function createActivity(data: {
  deal: string
  type: 'chamada' | 'email' | 'reuniao' | 'nota'
  description: string
  done?: boolean
  due_date?: string
  created_by: string
}): Promise<Activity> {
  return pb.collection('activities').create<Activity>(data, {
    expand: 'deal,created_by',
  })
}

export async function toggleActivityDone(id: string, done: boolean): Promise<Activity> {
  return pb.collection('activities').update<Activity>(
    id,
    { done },
    {
      expand: 'deal,created_by',
    },
  )
}

export async function deleteActivity(id: string): Promise<boolean> {
  return pb.collection('activities').delete(id)
}

// ==================== USERS SERVICE ====================
export async function getSellers(): Promise<AppUser[]> {
  try {
    return await pb.collection('users').getFullList<AppUser>({
      sort: 'name',
    })
  } catch {
    return []
  }
}

// ==================== IMPORTS AUDIT SERVICE ====================
export async function createImportRecord(data: {
  filename: string
  rows_total: number
  rows_imported: number
  rows_failed: number
  imported_by: string
}): Promise<ImportAudit> {
  return pb.collection('imports').create<ImportAudit>(data, {
    expand: 'imported_by',
  })
}

export async function getRecentImports(limit: number = 5): Promise<ImportAudit[]> {
  try {
    return await pb
      .collection('imports')
      .getList<ImportAudit>(1, limit, {
        sort: '-created',
        expand: 'imported_by',
      })
      .then((res) => res.items)
  } catch {
    return []
  }
}
