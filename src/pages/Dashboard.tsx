import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  Target,
  Percent,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  Award,
  Users,
  ChevronRight,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { useAuth } from '@/context/AuthContext'
import type { Deal, Activity, AppUser, DealStage } from '@/types/crm'
import { STAGES, STAGE_MAP, ACTIVITY_TYPE_CONFIG } from '@/types/crm'
import {
  getDeals,
  getRecentActivities,
  getSellers,
  formatBRL,
  formatBRLCompact,
  formatDateBR,
  toggleActivityDone,
} from '@/services/crm'
import { Button } from '@/components/ui/button'
import { DealModal } from '@/components/DealModal'
import { DealDrawer } from '@/components/DealDrawer'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

export const Dashboard: React.FC = () => {
  const { user, role } = useAuth()
  const { toast } = useToast()
  const isGestor = role === 'gestor'

  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [sellers, setSellers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  // Modals / Drawers
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [selectedDrawerDeal, setSelectedDrawerDeal] = useState<Deal | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [dealsRes, activitiesRes, sellersRes] = await Promise.all([
        getDeals(),
        getRecentActivities(10),
        getSellers(),
      ])
      setDeals(dealsRes)
      setActivities(activitiesRes)
      setSellers(sellersRes)
    } catch (err) {
      console.error('Error loading dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Subscribe to real-time deals & activities updates
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

  useRealtime<Activity>('activities', (e) => {
    if (e.action === 'create') {
      setActivities((prev) => [e.record, ...prev.filter((a) => a.id !== e.record.id)])
    } else if (e.action === 'update') {
      setActivities((prev) => prev.map((a) => (a.id === e.record.id ? e.record : a)))
    } else if (e.action === 'delete') {
      setActivities((prev) => prev.filter((a) => a.id !== e.record.id))
    }
  })

  // Calculation for Seller / Gestor Metrics
  // Deals in scope (PocketBase already filters for sellers, but let's ensure safe client metrics)
  const userDeals = isGestor
    ? deals
    : deals.filter(
        (d) => d.owner === user?.id || (d.expand?.owner && d.expand.owner.id === user?.id),
      )

  const openStages: DealStage[] = ['lead', 'contato-feito', 'proposta', 'negociacao']
  const openDeals = userDeals.filter((d) => openStages.includes(d.stage))
  const wonDeals = userDeals.filter((d) => d.stage === 'ganho')
  const lostDeals = userDeals.filter((d) => d.stage === 'perdido')
  const activeNegotiations = userDeals.filter((d) => ['proposta', 'negociacao'].includes(d.stage))

  const pipelineOpenValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const totalCompletedDeals = wonDeals.length + lostDeals.length
  const conversionRate =
    totalCompletedDeals > 0
      ? Math.round((wonDeals.length / (userDeals.length || 1)) * 100)
      : wonDeals.length > 0
        ? 100
        : 0
  const avgDealValue =
    userDeals.length > 0
      ? Math.round(userDeals.reduce((sum, d) => sum + (d.value || 0), 0) / userDeals.length)
      : 0

  // Chart data: Stage distribution
  const stageDistributionData = STAGES.map((s) => {
    const stageDeals = userDeals.filter((d) => d.stage === s.id)
    const val = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    return {
      name: s.label,
      count: stageDeals.length,
      value: val,
      color: s.color,
    }
  })

  // Chart data: Sales by Seller (Gestor only)
  const sellerPerformanceData = sellers
    .map((seller) => {
      const sellerWonDeals = deals.filter(
        (d) => (d.owner === seller.id || d.expand?.owner?.id === seller.id) && d.stage === 'ganho',
      )
      const sellerOpenDeals = deals.filter(
        (d) =>
          (d.owner === seller.id || d.expand?.owner?.id === seller.id) &&
          openStages.includes(d.stage),
      )
      const sellerAllDeals = deals.filter(
        (d) => d.owner === seller.id || d.expand?.owner?.id === seller.id,
      )
      const sellerWonTotal = sellerWonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
      const sellerOpenTotal = sellerOpenDeals.reduce((sum, d) => sum + (d.value || 0), 0)
      const conv =
        sellerAllDeals.length > 0
          ? Math.round((sellerWonDeals.length / sellerAllDeals.length) * 100)
          : 0

      return {
        id: seller.id,
        name: seller.name || seller.email.split('@')[0],
        wonTotal: sellerWonTotal,
        openTotal: sellerOpenTotal,
        wonCount: sellerWonDeals.length,
        totalCount: sellerAllDeals.length,
        conversion: conv,
      }
    })
    .sort((a, b) => b.wonTotal - a.wonTotal)

  const handleOpenDealDrawer = (deal: Deal) => {
    setSelectedDrawerDeal(deal)
    setDrawerOpen(true)
  }

  const handleEditDealFromDrawer = (deal: Deal) => {
    setEditingDeal(deal)
    setDealModalOpen(true)
  }

  const handleToggleActivity = async (act: Activity) => {
    try {
      const nextDone = !act.done
      await toggleActivityDone(act.id, nextDone)
      setActivities((prev) => prev.map((a) => (a.id === act.id ? { ...a, done: nextDone } : a)))
      toast({
        title: nextDone ? 'Atividade concluída' : 'Atividade reaberta',
      })
    } catch {
      toast({
        title: 'Erro ao atualizar atividade',
        variant: 'destructive',
      })
    }
  }

  const todayStr = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header with Greeting & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C2321] tracking-tight">
              Olá, {user?.name?.split(' ')[0] || 'Vendedor'} 👋
            </h1>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isGestor
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isGestor ? 'Visão Gestor' : 'Visão Vendedor'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5C6663] capitalize mt-0.5 font-medium">
            {todayStr} · Panorama atual de oportunidades
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingDeal(null)
            setDealModalOpen(true)
          }}
          className="bg-[#E4572E] hover:bg-[#C94F26] text-white font-bold h-11 px-5 rounded-xl shadow-md shadow-[#E4572E]/25 transition-all self-start sm:self-auto gap-2 group"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
          <span>+ Novo Negócio</span>
        </Button>
      </div>

      {/* KPI Cards Row (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E0] shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6663]">
              {isGestor ? 'Receita Ganha (Equipe)' : 'Ganho no Período'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#2E9E8F]/10 text-[#2E9E8F] flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1C2321] font-numeric">
            {formatBRL(wonValue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#2E9E8F]">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{wonDeals.length} negócios fechados</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E0] shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6663]">
              {isGestor ? 'Pipeline Total em Aberto' : 'Pipeline em Aberto'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#E4572E]/10 text-[#E4572E] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1C2321] font-numeric">
            {formatBRL(pipelineOpenValue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#5C6663]">
            <span>{openDeals.length} oportunidades ativas</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E0] shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6663]">
              {isGestor ? 'Ticket Médio' : 'Negociações Ativas'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1C2321] font-numeric">
            {isGestor ? formatBRL(avgDealValue) : activeNegotiations.length}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-amber-700">
            {isGestor ? (
              <span>Por oportunidade gerada</span>
            ) : (
              <span>Em proposta ou negociação</span>
            )}
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E0] shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6663]">
              Taxa de Conversão
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1C2321] font-numeric">
            {conversionRate}%
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-indigo-700">
            <span>
              {wonDeals.length} ganhos de {userDeals.length} totais
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on desktop): Funnel / Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E7E5E0] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#1C2321] tracking-tight">
                {isGestor ? 'Distribuição do Pipeline por Etapa' : 'Seu Funil de Vendas'}
              </h2>
              <p className="text-xs text-[#5C6663] mt-0.5">
                Volume financeiro (R$) e quantidade de negócios por estágio
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stageDistributionData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  fontWeight={600}
                  fill="#5C6663"
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  fill="#8A938F"
                  tickFormatter={(val) => formatBRLCompact(val)}
                />
                <Tooltip
                  formatter={(val: any) => [formatBRL(Number(val)), 'Valor']}
                  labelFormatter={(label) => `Etapa: ${label}`}
                  contentStyle={{
                    backgroundColor: '#1C2321',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                  itemStyle={{ color: '#E4572E' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {stageDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Stage Chips Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
            {stageDistributionData.map((s) => (
              <div
                key={s.name}
                className="p-2 rounded-xl bg-[#F6F5F2] border border-[#E7E5E0] text-center"
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] font-bold text-[#5C6663] truncate">{s.name}</span>
                </div>
                <span className="text-xs font-extrabold text-[#1C2321] block font-numeric">
                  {s.count} neg.
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Mini Activities Feed or Seller Ranking */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E0] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#E4572E]" />
                <h2 className="text-lg font-extrabold text-[#1C2321] tracking-tight">
                  {isGestor ? 'Feed de Atividades' : 'Próximas Ações'}
                </h2>
              </div>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12 px-4 text-xs text-[#8A938F]">
                Nenhuma atividade recente encontrada.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map((act) => {
                  const typeConf = ACTIVITY_TYPE_CONFIG[act.type] || ACTIVITY_TYPE_CONFIG.nota
                  return (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl border border-[#E7E5E0] bg-[#F6F5F2]/60 hover:bg-white hover:shadow-2xs transition-all flex items-start gap-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleActivity(act)}
                        className="mt-0.5 text-slate-400 hover:text-[#2E9E8F]"
                      >
                        {act.done ? (
                          <CheckCircle2 className="w-4 h-4 text-[#2E9E8F]" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${typeConf.badgeClass}`}
                          >
                            {typeConf.label}
                          </span>
                          {act.due_date && (
                            <span className="text-[10px] text-[#8A938F]">
                              {formatDateBR(act.due_date)}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs text-[#1C2321] line-clamp-2 leading-relaxed ${
                            act.done ? 'line-through text-[#8A938F]' : ''
                          }`}
                        >
                          {act.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E7E5E0] mt-4">
            <NavLinktoPipeline />
          </div>
        </div>
      </div>

      {/* Gestor Specific: Ranking & Performance by Seller */}
      {isGestor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seller Sales Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E7E5E0] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#E4572E]" />
                <h2 className="text-lg font-extrabold text-[#1C2321] tracking-tight">
                  Vendas Ganhas por Vendedor
                </h2>
              </div>
              <span className="text-xs font-bold text-[#2E9E8F] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Receita Total: {formatBRL(wonValue)}
              </span>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sellerPerformanceData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatBRLCompact(v)}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    fontSize={12}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatBRL(Number(val)), 'Total Ganho']}
                    contentStyle={{
                      backgroundColor: '#1C2321',
                      borderRadius: '12px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="wonTotal" fill="#2E9E8F" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E7E5E0] shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E7E5E0] pb-4">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-extrabold text-[#1C2321] tracking-tight">
                Ranking da Equipe
              </h2>
            </div>

            <div className="space-y-3">
              {sellerPerformanceData.map((seller, index) => (
                <div
                  key={seller.id}
                  className="p-3.5 rounded-xl border border-[#E7E5E0] bg-[#F6F5F2]/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs ${
                        index === 0
                          ? 'bg-amber-400 text-amber-950 shadow-sm'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {index + 1}º
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[#1C2321]">{seller.name}</p>
                      <p className="text-[10px] text-[#5C6663] font-numeric">
                        {seller.wonCount} fechados · {seller.conversion}% conv.
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-[#2E9E8F] font-numeric block">
                      {formatBRL(seller.wonTotal)}
                    </span>
                    <span className="text-[10px] text-[#8A938F]">
                      {formatBRLCompact(seller.openTotal)} aberto
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Deals Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E0] shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#1C2321] tracking-tight">
              Oportunidades Recentes
            </h2>
            <p className="text-xs text-[#5C6663] mt-0.5">
              Clique em qualquer linha para abrir a gaveta de detalhes e histórico
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = '/pipeline'
            }}
            className="rounded-xl text-xs gap-1.5"
          >
            <span>Ver Pipeline Completo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {userDeals.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#1C2321]">Nenhum negócio registrado</h3>
            <p className="text-xs text-[#5C6663] max-w-sm mx-auto mt-1 mb-4">
              Comece adicionando seu primeiro lead ou importe uma planilha Excel para acelerar.
            </p>
            <Button
              onClick={() => {
                setEditingDeal(null)
                setDealModalOpen(true)
              }}
              className="bg-[#E4572E] text-white rounded-xl text-xs font-bold"
            >
              + Criar Primeiro Negócio
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E7E5E0] text-[11px] font-bold uppercase tracking-wider text-[#8A938F]">
                  <th className="pb-3 pl-2">Negócio / Cliente</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Etapa</th>
                  <th className="pb-3">Prazo Previsto</th>
                  {isGestor && <th className="pb-3">Responsável</th>}
                  <th className="pb-3 pr-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E0]">
                {userDeals.slice(0, 6).map((deal) => {
                  const stageConf = STAGE_MAP[deal.stage] || STAGES[0]
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => handleOpenDealDrawer(deal)}
                      className="hover:bg-[#F6F5F2]/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 pl-2">
                        <p className="font-extrabold text-sm text-[#1C2321] group-hover:text-[#E4572E] transition-colors">
                          {deal.title}
                        </p>
                        <p className="text-xs text-[#5C6663] flex items-center gap-1.5 mt-0.5 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-[#8A938F]" />
                          <span>{deal.customer_name}</span>
                        </p>
                      </td>
                      <td className="py-3.5 font-extrabold text-[#1C2321] font-numeric text-sm">
                        {formatBRL(deal.value)}
                      </td>
                      <td className="py-3.5">
                        <span
                          className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border inline-block"
                          style={{
                            backgroundColor: `${stageConf.color}15`,
                            color: stageConf.color,
                            borderColor: `${stageConf.color}30`,
                          }}
                        >
                          {stageConf.label}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-[#5C6663] font-medium">
                        {formatDateBR(deal.expected_close_date)}
                      </td>
                      {isGestor && (
                        <td className="py-3.5 text-xs text-[#1C2321] font-semibold">
                          {deal.expand?.owner?.name || 'Vendedor'}
                        </td>
                      )}
                      <td className="py-3.5 pr-2 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#E4572E] ml-auto transition-transform group-hover:translate-x-1" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deal Modal & Drawer */}
      <DealModal
        open={dealModalOpen}
        onOpenChange={setDealModalOpen}
        deal={editingDeal}
        sellers={sellers}
        currentUserId={user?.id || ''}
        isGestor={isGestor}
        onSuccess={loadData}
      />

      <DealDrawer
        deal={selectedDrawerDeal}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={handleEditDealFromDrawer}
        currentUserId={user?.id || ''}
        onDealUpdated={loadData}
      />
    </div>
  )
}

const NavLinktoPipeline: React.FC = () => {
  return (
    <Button
      variant="outline"
      onClick={() => {
        window.location.href = '/pipeline'
      }}
      className="w-full justify-between rounded-xl h-10 border-[#E7E5E0] text-xs font-bold text-[#1C2321] hover:bg-[#F6F5F2]"
    >
      <span>Ir para o Plano de Ação (Kanban)</span>
      <ChevronRight className="w-4 h-4 text-[#E4572E]" />
    </Button>
  )
}

export default Dashboard
