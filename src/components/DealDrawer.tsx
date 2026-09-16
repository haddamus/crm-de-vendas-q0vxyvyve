import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  User,
  Mail,
  Phone,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Send,
  Building2,
  Edit,
} from 'lucide-react'
import type { Deal, Activity, DealStage, ActivityType } from '@/types/crm'
import { STAGES, STAGE_MAP, ACTIVITY_TYPE_CONFIG } from '@/types/crm'
import {
  formatBRL,
  formatDateBR,
  updateDeal,
  getActivities,
  createActivity,
  toggleActivityDone,
  deleteActivity,
} from '@/services/crm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'

interface DealDrawerProps {
  deal: Deal | null
  open: boolean
  onClose: () => void
  onEdit: (deal: Deal) => void
  currentUserId: string
  onDealUpdated?: () => void
}

export const DealDrawer: React.FC<DealDrawerProps> = ({
  deal,
  open,
  onClose,
  onEdit,
  currentUserId,
  onDealUpdated,
}) => {
  const { toast } = useToast()
  const [currentDeal, setCurrentDeal] = useState<Deal | null>(deal)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // New activity form state
  const [newType, setNewType] = useState<ActivityType>('chamada')
  const [newDesc, setNewDesc] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [isSubmittingAct, setIsSubmittingAct] = useState(false)

  useEffect(() => {
    setCurrentDeal(deal)
    if (deal) {
      setNotes(deal.notes || '')
      loadActivities(deal.id)
    }
  }, [deal])

  // Realtime subscription for activities
  useRealtime<Activity>(
    'activities',
    (e) => {
      if (!currentDeal) return
      if (e.record.deal === currentDeal.id) {
        if (e.action === 'create') {
          setActivities((prev) => [e.record, ...prev.filter((a) => a.id !== e.record.id)])
        } else if (e.action === 'update') {
          setActivities((prev) => prev.map((a) => (a.id === e.record.id ? e.record : a)))
        } else if (e.action === 'delete') {
          setActivities((prev) => prev.filter((a) => a.id !== e.record.id))
        }
      }
    },
    open && !!currentDeal,
  )

  const loadActivities = async (dealId: string) => {
    try {
      setLoadingActivities(true)
      const data = await getActivities(dealId)
      setActivities(data)
    } catch (err) {
      console.error('Failed to load activities', err)
    } finally {
      setLoadingActivities(false)
    }
  }

  if (!open || !currentDeal) return null

  const handleStageChange = async (newStage: DealStage) => {
    try {
      const updated = await updateDeal(currentDeal.id, { stage: newStage })
      setCurrentDeal(updated)
      toast({
        title: 'Etapa atualizada',
        description: `Oportunidade movida para ${STAGE_MAP[newStage]?.label}.`,
      })
      if (onDealUpdated) onDealUpdated()
    } catch (err) {
      toast({
        title: 'Erro ao alterar etapa',
        description: 'Não foi possível mover o negócio.',
        variant: 'destructive',
      })
    }
  }

  const handleSaveNotes = async () => {
    try {
      setIsSavingNotes(true)
      const updated = await updateDeal(currentDeal.id, { notes })
      setCurrentDeal(updated)
      toast({
        title: 'Notas salvas',
        description: 'Observações atualizadas com sucesso.',
      })
      if (onDealUpdated) onDealUpdated()
    } catch (err) {
      toast({
        title: 'Erro ao salvar notas',
        variant: 'destructive',
      })
    } finally {
      setIsSavingNotes(false)
    }
  }

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDesc.trim()) return

    try {
      setIsSubmittingAct(true)
      const act = await createActivity({
        deal: currentDeal.id,
        type: newType,
        description: newDesc.trim(),
        due_date: newDueDate ? `${newDueDate} 00:00:00.000Z` : undefined,
        created_by: currentUserId,
        done: false,
      })
      setActivities([act, ...activities])
      setNewDesc('')
      setNewDueDate('')
      toast({
        title: 'Atividade registrada',
        description: 'Nova ação adicionada à timeline.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao criar atividade',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingAct(false)
    }
  }

  const handleToggleDone = async (activity: Activity) => {
    try {
      const nextDone = !activity.done
      const updated = await toggleActivityDone(activity.id, nextDone)
      setActivities((prev) => prev.map((a) => (a.id === activity.id ? updated : a)))
      toast({
        title: nextDone ? 'Atividade concluída!' : 'Atividade reaberta',
      })
    } catch (err) {
      toast({
        title: 'Erro ao atualizar atividade',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteActivity = async (id: string) => {
    try {
      await deleteActivity(id)
      setActivities((prev) => prev.filter((a) => a.id !== id))
      toast({
        title: 'Atividade excluída',
      })
    } catch (err) {
      toast({
        title: 'Erro ao excluir atividade',
        variant: 'destructive',
      })
    }
  }

  const currentStageConfig = STAGE_MAP[currentDeal.stage] || STAGES[0]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-fade-in"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-left overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header with Stage Accent */}
        <div
          className="px-6 py-5 border-b border-[#E7E5E0] flex items-start justify-between relative"
          style={{
            borderTop: `5px solid ${currentStageConfig.color}`,
          }}
        >
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${currentStageConfig.color}15`,
                  color: currentStageConfig.color,
                }}
              >
                {currentStageConfig.label}
              </span>
              <span className="text-xs text-[#8A938F]">ID: #{currentDeal.id.slice(0, 7)}</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#1C2321] leading-tight">
              {currentDeal.title}
            </h2>
            <div className="flex items-center gap-2 text-sm text-[#5C6663] mt-1 font-medium">
              <Building2 className="w-4 h-4 text-[#8A938F]" />
              <span>{currentDeal.customer_name}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(currentDeal)}
              className="rounded-lg h-8 px-2.5 text-xs gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Editar</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-lg w-8 h-8 text-[#8A938F] hover:text-[#1C2321]"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Key Info Box */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F6F5F2] border border-[#E7E5E0]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A938F] block">
                Valor Total
              </span>
              <span className="text-lg font-extrabold text-[#1C2321] font-numeric mt-0.5 block">
                {formatBRL(currentDeal.value)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A938F] block">
                Prazo Previsto
              </span>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#1C2321] mt-1">
                <Calendar className="w-3.5 h-3.5 text-[#8A938F]" />
                <span>{formatDateBR(currentDeal.expected_close_date)}</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A938F] block">
                Responsável
              </span>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#1C2321] mt-1 truncate">
                <User className="w-3.5 h-3.5 text-[#8A938F]" />
                <span className="truncate">{currentDeal.expand?.owner?.name || 'Vendedor'}</span>
              </div>
            </div>
          </div>

          {/* Quick Stage Switcher Buttons */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#5C6663] block mb-2">
              Mudar Etapa do Pipeline
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STAGES.map((s) => {
                const isActive = currentDeal.stage === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStageChange(s.id)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-[#E7E5E0] bg-white text-[#5C6663] hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    style={isActive ? { backgroundColor: s.color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isActive ? '#fff' : s.color }}
                    />
                    <span className="truncate">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contact Details */}
          {(currentDeal.customer_email || currentDeal.customer_phone) && (
            <div className="p-4 rounded-xl border border-[#E7E5E0] bg-white space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5C6663] block">
                Informações de Contato
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {currentDeal.customer_email && (
                  <div className="flex items-center gap-2 text-[#1C2321]">
                    <Mail className="w-4 h-4 text-[#8A938F]" />
                    <a
                      href={`mailto:${currentDeal.customer_email}`}
                      className="text-[#E4572E] hover:underline truncate"
                    >
                      {currentDeal.customer_email}
                    </a>
                  </div>
                )}
                {currentDeal.customer_phone && (
                  <div className="flex items-center gap-2 text-[#1C2321]">
                    <Phone className="w-4 h-4 text-[#8A938F]" />
                    <span>{currentDeal.customer_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes and observations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#5C6663]">
                Observações do Negócio
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="h-7 text-xs text-[#E4572E] hover:text-[#C94F26] hover:bg-[#E4572E]/10"
              >
                {isSavingNotes ? 'Salvando...' : 'Salvar notas'}
              </Button>
            </div>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione anotações sobre o cliente, objeções, termos negociados..."
              className="rounded-xl bg-[#F6F5F2]/50 focus:bg-white text-sm"
            />
          </div>

          {/* Activities / Timeline Section */}
          <div className="space-y-4 pt-2 border-t border-[#E7E5E0]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#E4572E]" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1C2321]">
                  Atividades & Histórico ({activities.length})
                </h3>
              </div>
            </div>

            {/* Quick Add Activity Form */}
            <form
              onSubmit={handleCreateActivity}
              className="p-3.5 rounded-2xl bg-[#F6F5F2] border border-[#E7E5E0] space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <Select value={newType} onValueChange={(val) => setNewType(val as ActivityType)}>
                    <SelectTrigger className="h-9 rounded-xl text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chamada">📞 Chamada</SelectItem>
                      <SelectItem value="email">✉️ E-mail</SelectItem>
                      <SelectItem value="reuniao">📅 Reunião</SelectItem>
                      <SelectItem value="nota">📝 Nota</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="h-9 rounded-xl text-xs bg-white"
                    placeholder="Prazo"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Descreva a atividade ou próximo passo..."
                  className="h-9 rounded-xl text-xs bg-white flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingAct || !newDesc.trim()}
                  className="h-9 px-3 rounded-xl bg-[#E4572E] hover:bg-[#C94F26] text-white font-bold text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>

            {/* Activities List */}
            {loadingActivities ? (
              <div className="text-center py-6 text-xs text-[#8A938F]">
                Carregando atividades...
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[#E7E5E0] text-xs text-[#8A938F]">
                Nenhuma atividade registrada ainda. Use o formulário acima para registrar chamadas,
                reuniões ou notas.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activities.map((act) => {
                  const typeConf = ACTIVITY_TYPE_CONFIG[act.type] || ACTIVITY_TYPE_CONFIG.nota
                  return (
                    <div
                      key={act.id}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        act.done
                          ? 'bg-[#F6F5F2]/70 border-[#E7E5E0] opacity-75'
                          : 'bg-white border-[#E7E5E0] shadow-2xs hover:border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleDone(act)}
                        className="mt-0.5 text-slate-400 hover:text-[#2E9E8F] transition-colors"
                      >
                        {act.done ? (
                          <CheckCircle2 className="w-4 h-4 text-[#2E9E8F]" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${typeConf.badgeClass}`}
                          >
                            {typeConf.label}
                          </span>
                          {act.due_date && (
                            <span className="text-[11px] text-[#8A938F] flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3" />
                              {formatDateBR(act.due_date)}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs text-[#1C2321] leading-relaxed ${
                            act.done ? 'line-through text-[#8A938F]' : ''
                          }`}
                        >
                          {act.description}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteActivity(act.id)}
                        className="w-6 h-6 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
