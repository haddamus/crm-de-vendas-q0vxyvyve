import React, { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Building2, Calendar } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { Deal, AppUser, DealStage } from '@/types/crm'
import { STAGES, STAGE_MAP } from '@/types/crm'
import {
  getDeals,
  getSellers,
  updateDeal,
  formatBRL,
  formatBRLCompact,
  formatDateBR,
} from '@/services/crm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DealModal } from '@/components/DealModal'
import { DealDrawer } from '@/components/DealDrawer'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

export const Pipeline: React.FC = () => {
  const { user, role } = useAuth()
  const { toast } = useToast()
  const isGestor = role === 'gestor'

  const [deals, setDeals] = useState<Deal[]>([])
  const [sellers, setSellers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('all')

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStage, setModalStage] = useState<DealStage>('lead')
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedDrawerDeal, setSelectedDrawerDeal] = useState<Deal | null>(null)

  // Drag and Drop state
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [dealsRes, sellersRes] = await Promise.all([getDeals(), getSellers()])
      setDeals(dealsRes)
      setSellers(sellersRes)
    } catch (err) {
      console.error('Error loading pipeline data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Real-time synchronization
  useRealtime<Deal>('deals', (e) => {
    if (e.action === 'create') {
      setDeals((prev) => [e.record, ...prev.filter((d) => d.id !== e.record.id)])
    } else if (e.action === 'update') {
      setDeals((prev) => prev.map((d) => (d.id === e.record.id ? e.record : d)))
      if (selectedDrawerDeal?.id === e.record.id) {
        setSelectedDrawerDeal(e.record)
      }
    } else if (e.action === 'delete') {
      setDeals((prev) => prev.filter((d) => d.id !== e.record.id))
      if (selectedDrawerDeal?.id === e.record.id) {
        setDrawerOpen(false)
      }
    }
  })

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Search filter
      const matchesSearch =
        deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.customer_name.toLowerCase().includes(searchTerm.toLowerCase())

      // Gestor seller filter
      const matchesSeller =
        selectedSellerFilter === 'all' ||
        deal.owner === selectedSellerFilter ||
        (deal.expand?.owner && deal.expand.owner.id === selectedSellerFilter)

      return matchesSearch && matchesSeller
    })
  }, [deals, searchTerm, selectedSellerFilter])

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const map: Record<DealStage, Deal[]> = {
      lead: [],
      'contato-feito': [],
      proposta: [],
      negociacao: [],
      ganho: [],
      perdido: [],
    }

    filteredDeals.forEach((d) => {
      if (map[d.stage]) {
        map[d.stage].push(d)
      } else {
        map['lead'].push(d)
      }
    })

    return map
  }, [filteredDeals])

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedDealId(dealId)
  }

  const handleDragEnd = () => {
    setDraggedDealId(null)
    setDragOverStage(null)
  }

  const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stage) {
      setDragOverStage(stage)
    }
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault()
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId
    setDragOverStage(null)
    setDraggedDealId(null)

    if (!dealId) return

    const currentDeal = deals.find((d) => d.id === dealId)
    if (!currentDeal || currentDeal.stage === targetStage) return

    const previousStage = currentDeal.stage

    // Optimistic UI update
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d)))

    try {
      await updateDeal(dealId, { stage: targetStage })
      toast({
        title: 'Etapa atualizada!',
        description: `"${currentDeal.title}" movido para ${STAGE_MAP[targetStage]?.label}.`,
      })
    } catch (err) {
      // Revert optimistic update on failure
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: previousStage } : d)))
      toast({
        title: 'Erro ao mover negócio',
        description: 'Não foi possível atualizar a etapa.',
        variant: 'destructive',
      })
    }
  }

  const handleOpenAddDeal = (stage: DealStage = 'lead') => {
    setEditingDeal(null)
    setModalStage(stage)
    setModalOpen(true)
  }

  const handleOpenEditDeal = (deal: Deal) => {
    setEditingDeal(deal)
    setModalStage(deal.stage)
    setModalOpen(true)
  }

  const handleCardClick = (deal: Deal) => {
    setSelectedDrawerDeal(deal)
    setDrawerOpen(true)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F6F5F2]">
      {/* Top Action Bar */}
      <div className="p-4 sm:p-6 border-b border-[#E7E5E0] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#1C2321] tracking-tight">Plano de Ação</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4572E]/10 text-[#E4572E] border border-[#E4572E]/20">
              {filteredDeals.length} oportunidades
            </span>
          </div>
          <p className="text-xs text-[#5C6663] mt-0.5">
            Arraste os cartões entre as etapas para atualizar o status em tempo real.
          </p>
        </div>

        {/* Search, Filter & CTA */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-[#8A938F] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar negócio ou cliente..."
              className="pl-9 h-10 rounded-xl border-[#E7E5E0] text-xs bg-[#F6F5F2]/50 focus:bg-white"
            />
          </div>

          {/* Gestor Scope Filter */}
          {isGestor && (
            <div className="w-[180px]">
              <Select value={selectedSellerFilter} onValueChange={setSelectedSellerFilter}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white border-[#E7E5E0]">
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name || s.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={() => handleOpenAddDeal('lead')}
            className="bg-[#E4572E] hover:bg-[#C94F26] text-white font-bold h-10 px-4 rounded-xl shadow-md shadow-[#E4572E]/20 transition-all text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Negócio</span>
          </Button>
        </div>
      </div>

      {/* Kanban Canvas (Horizontal Scrolling) */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        <div className="flex gap-4 min-w-[1300px] h-full items-start pb-4">
          {STAGES.map((col) => {
            const stageDeals = dealsByStage[col.id] || []
            const stageTotalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
            const isTarget = dragOverStage === col.id

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-[280px] flex-shrink-0 flex flex-col max-h-full rounded-2xl border transition-all duration-200 ${
                  isTarget
                    ? 'border-[#E4572E] ring-2 ring-[#E4572E]/30 bg-orange-50/50 shadow-md'
                    : 'border-[#E7E5E0] bg-[#F1EFEA]/80'
                }`}
              >
                {/* Column Header */}
                <div
                  className="p-3.5 border-b border-[#E7E5E0] bg-white rounded-t-2xl flex items-center justify-between"
                  style={{ borderTop: `4px solid ${col.color}` }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                    <h2 className="text-xs font-extrabold text-[#1C2321] truncate tracking-tight">
                      {col.label}
                    </h2>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-[#5C6663]">
                      {stageDeals.length}
                    </span>
                  </div>

                  <span className="text-xs font-extrabold text-[#1C2321] font-numeric">
                    {formatBRLCompact(stageTotalValue)}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 min-h-[150px]">
                  {stageDeals.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-300 rounded-xl text-slate-400">
                      <span className="text-[11px] font-medium">Nenhum negócio nesta etapa</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Arraste para cá</span>
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const isDragging = draggedDealId === deal.id
                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleCardClick(deal)}
                          className={`p-3.5 bg-white rounded-xl border border-[#E7E5E0] shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-grab active:cursor-grabbing group relative overflow-hidden ${
                            isDragging ? 'opacity-40 scale-95' : ''
                          }`}
                        >
                          {/* Stage color left bar */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1"
                            style={{ backgroundColor: col.color }}
                          />

                          <div className="pl-1.5">
                            {/* Card Header: Title */}
                            <h3 className="text-xs font-extrabold text-[#1C2321] line-clamp-2 leading-snug group-hover:text-[#E4572E] transition-colors">
                              {deal.title}
                            </h3>

                            {/* Customer */}
                            <p className="text-[11px] text-[#5C6663] flex items-center gap-1.5 mt-1 truncate font-medium">
                              <Building2 className="w-3 h-3 text-[#8A938F] flex-shrink-0" />
                              <span className="truncate">{deal.customer_name}</span>
                            </p>

                            {/* Card Footer: Value + Date/Owner */}
                            <div className="mt-3 pt-2.5 border-t border-[#F1EFEA] flex items-center justify-between gap-1">
                              <span className="text-xs font-extrabold text-[#1C2321] font-numeric">
                                {formatBRL(deal.value)}
                              </span>

                              <div className="flex items-center gap-1.5 text-[10px] text-[#8A938F]">
                                {deal.expected_close_date ? (
                                  <span className="flex items-center gap-1 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                    <Calendar className="w-2.5 h-2.5" />
                                    {formatDateBR(deal.expected_close_date)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Sem prazo</span>
                                )}

                                {isGestor && deal.expand?.owner && (
                                  <span
                                    title={`Vendedor: ${deal.expand.owner.name}`}
                                    className="w-5 h-5 rounded-full bg-[#1C2321] text-white flex items-center justify-center text-[9px] font-bold"
                                  >
                                    {deal.expand.owner.name?.[0]?.toUpperCase() || 'V'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Column Add CTA */}
                <div className="p-2 border-t border-[#E7E5E0] bg-white/50 rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => handleOpenAddDeal(col.id)}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-[#E4572E] text-slate-500 hover:text-[#E4572E] hover:bg-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar negócio</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deal Modal & Drawer */}
      <DealModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        deal={editingDeal}
        initialStage={modalStage}
        sellers={sellers}
        currentUserId={user?.id || ''}
        isGestor={isGestor}
        onSuccess={loadData}
      />

      <DealDrawer
        deal={selectedDrawerDeal}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={(deal) => {
          handleOpenEditDeal(deal)
        }}
        currentUserId={user?.id || ''}
        onDealUpdated={loadData}
      />
    </div>
  )
}

export default Pipeline
