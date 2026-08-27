import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STAGES } from '@/types/crm'
import type { Deal, AppUser, DealStage } from '@/types/crm'
import { createDeal, updateDeal } from '@/services/crm'
import { useToast } from '@/hooks/use-toast'

interface DealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal?: Deal | null
  initialStage?: DealStage
  sellers: AppUser[]
  currentUserId: string
  isGestor: boolean
  onSuccess?: () => void
}

export const DealModal: React.FC<DealModalProps> = ({
  open,
  onOpenChange,
  deal,
  initialStage = 'lead',
  sellers,
  currentUserId,
  isGestor,
  onSuccess,
}) => {
  const { toast } = useToast()
  const isEditing = !!deal

  const [title, setTitle] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [value, setValue] = useState('')
  const [stage, setStage] = useState<DealStage>(initialStage)
  const [owner, setOwner] = useState(currentUserId)
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (deal) {
      setTitle(deal.title || '')
      setCustomerName(deal.customer_name || '')
      setCustomerEmail(deal.customer_email || '')
      setCustomerPhone(deal.customer_phone || '')
      setValue(deal.value?.toString() || '0')
      setStage(deal.stage || 'lead')
      setOwner(deal.owner || currentUserId)
      setExpectedCloseDate(deal.expected_close_date ? deal.expected_close_date.split('T')[0] : '')
      setNotes(deal.notes || '')
    } else {
      setTitle('')
      setCustomerName('')
      setCustomerEmail('')
      setCustomerPhone('')
      setValue('')
      setStage(initialStage)
      setOwner(currentUserId)
      setExpectedCloseDate('')
      setNotes('')
    }
    setFieldErrors({})
  }, [deal, initialStage, currentUserId, open])

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Nome do negócio é obrigatório'
    if (!customerName.trim()) errors.customerName = 'Nome do cliente é obrigatório'

    const parsedValue = parseFloat(value.replace(',', '.'))
    if (isNaN(parsedValue) || parsedValue < 0) {
      errors.value = 'Informe um valor numérico válido'
    }

    if (customerEmail && !customerEmail.includes('@')) {
      errors.customerEmail = 'E-mail inválido'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const numValue = parseFloat(value.replace(',', '.')) || 0

    try {
      setIsSubmitting(true)
      if (isEditing && deal) {
        await updateDeal(deal.id, {
          title: title.trim(),
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          value: numValue,
          stage,
          owner: isGestor ? owner : currentUserId,
          expected_close_date: expectedCloseDate ? `${expectedCloseDate} 00:00:00.000Z` : undefined,
          notes: notes.trim() || undefined,
        })
        toast({
          title: 'Negócio atualizado',
          description: `"${title}" foi atualizado com sucesso.`,
        })
      } else {
        await createDeal({
          title: title.trim(),
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          value: numValue,
          stage,
          owner: isGestor ? owner : currentUserId,
          expected_close_date: expectedCloseDate ? `${expectedCloseDate} 00:00:00.000Z` : undefined,
          notes: notes.trim() || undefined,
        })
        toast({
          title: 'Novo negócio criado',
          description: `"${title}" adicionado ao plano de ação.`,
        })
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Save deal error:', err)
      toast({
        title: 'Erro ao salvar negócio',
        description: err.message || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-6 bg-white border-[#E7E5E0]">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-[#1C2321]">
            {isEditing ? 'Editar Oportunidade' : 'Novo Negócio no Pipeline'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Nome do negócio */}
          <div className="space-y-1.5">
            <Label
              htmlFor="title"
              className="text-xs font-bold uppercase tracking-wider text-[#5C6663]"
            >
              Nome do negócio *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Contrato Anual de Software"
              className={`rounded-xl h-10 ${fieldErrors.title ? 'border-red-500 bg-red-50/20' : ''}`}
            />
            {fieldErrors.title && (
              <p className="text-[11px] text-red-600 font-medium">{fieldErrors.title}</p>
            )}
          </div>

          {/* Cliente e Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="customerName"
                className="text-xs font-bold uppercase tracking-wider text-[#5C6663]"
              >
                Cliente / Empresa *
              </Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="ex: Acme Logística"
                className={`rounded-xl h-10 ${fieldErrors.customerName ? 'border-red-500 bg-red-50/20' : ''}`}
              />
              {fieldErrors.customerName && (
                <p className="text-[11px] text-red-600 font-medium">{fieldErrors.customerName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="value"
                className="text-xs font-bold uppercase tracking-wider text-[#5C6663]"
              >
                Valor (R$) *
              </Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className={`rounded-xl h-10 ${fieldErrors.value ? 'border-red-500 bg-red-50/20' : ''}`}
              />
              {fieldErrors.value && (
                <p className="text-[11px] text-red-600 font-medium">{fieldErrors.value}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="customerEmail"
                className="text-xs font-bold uppercase tracking-wider text-[#5C6663]"
              >
                E-mail de contato
              </Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="contato@empresa.com"
                className={`rounded-xl h-10 ${fieldErrors.customerEmail ? 'border-red-500 bg-red-50/20' : ''}`}
              />
              {fieldErrors.customerEmail && (
                <p className="text-[11px] text-red-600 font-medium">{fieldErrors.customerEmail}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="customerPhone"
                className="text-xs font-bold uppercase tracking-wider text-[#5C6663]"
              >
                Telefone / WhatsApp
              </Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="rounded-xl h-10"
              />
            </div>
          </div>

          {/* Etapa e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#5C6663]">
                Etapa do Pipeline
              </Label>
              <Select value={stage} onValueChange={(val) => setStage(val as DealStage)}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span>{s.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#5C6663]">
                Prazo Previsto
              </Label>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="rounded-xl h-10"
              />
            </div>
          </div>

          {/* Vendedor Responsável (se gestor) */}
          {isGestor && sellers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#5C6663]">
                Vendedor(a) Responsável
              </Label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-1.5">
            <Label
              htmlFor="notes"
              className="text-xs font-bold uppercase tracking-wider text-[#5C6663]"
            >
              Observações e Próximos Passos
            </Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais sobre a negociação..."
              className="rounded-xl resize-none"
            />
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#E4572E] hover:bg-[#C94F26] text-white rounded-xl font-bold shadow-md shadow-[#E4572E]/20"
            >
              {isSubmitting
                ? 'Salvando...'
                : isEditing
                  ? 'Salvar Alterações'
                  : 'Criar Oportunidade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
