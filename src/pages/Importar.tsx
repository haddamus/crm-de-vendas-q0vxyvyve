import React, { useState, useEffect } from 'react'
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Building2,
  DollarSign,
  Calendar,
  AlertTriangle,
  RotateCcw,
  History,
  User,
  Layers,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { AppUser, DealStage } from '@/types/crm'
import { STAGES, STAGE_MAP } from '@/types/crm'
import {
  getSellers,
  createDeal,
  createImportRecord,
  getRecentImports,
  formatBRL,
  formatDateBR,
} from '@/services/crm'
import type { ImportAudit } from '@/types/crm'
import { parseCSV, downloadTemplate, downloadErrorLog } from '@/lib/xlsxHelper'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'

interface RowValidation {
  rowNumber: number
  title: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  value: number
  stage: DealStage
  expectedCloseDate?: string
  notes?: string
  isValid: boolean
  errors: string[]
}

export const Importar: React.FC = () => {
  const { user, role } = useAuth()
  const { toast } = useToast()
  const isGestor = role === 'gestor'

  // Wizard Steps: 1: Upload, 2: Preview & Mapping, 3: Executing / Finished
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Sellers
  const [sellers, setSellers] = useState<AppUser[]>([])
  const [selectedOwner, setSelectedOwner] = useState<string>(user?.id || '')

  // Parsed Raw Headers & Rows
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])

  // Column Mappings: target CRM field -> index of spreadsheet column
  const [mappings, setMappings] = useState<{
    title: string
    customer_name: string
    customer_email: string
    customer_phone: string
    value: string
    stage: string
    expected_close_date: string
    notes: string
  }>({
    title: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    value: '',
    stage: '',
    expected_close_date: '',
    notes: '',
  })

  // Validated Rows Preview
  const [validatedRows, setValidatedRows] = useState<RowValidation[]>([])

  // Import Execution State
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [importFinished, setImportFinished] = useState(false)
  const [importStats, setImportStats] = useState<{
    total: number
    success: number
    failed: number
    failedList: { rowNumber: number; title: string; reason: string }[]
  }>({
    total: 0,
    success: 0,
    failed: 0,
    failedList: [],
  })

  // Recent Import Audits
  const [recentImports, setRecentImports] = useState<ImportAudit[]>([])

  useEffect(() => {
    getSellers().then(setSellers)
    getRecentImports(5).then(setRecentImports)
  }, [])

  useEffect(() => {
    if (user?.id && !selectedOwner) {
      setSelectedOwner(user.id)
    }
  }, [user, selectedOwner])

  // Normalizes column headers to auto-guess mapping
  const autoMapColumns = (headers: string[]) => {
    const newMap = { ...mappings }

    headers.forEach((h, idx) => {
      const clean = h.toLowerCase().trim()
      const strIdx = idx.toString()

      if (
        clean.includes('nome do neg') ||
        clean.includes('título') ||
        clean.includes('titulo') ||
        clean.includes('negócio') ||
        clean.includes('oportunidade')
      ) {
        newMap.title = strIdx
      } else if (
        clean.includes('cliente') ||
        clean.includes('empresa') ||
        clean.includes('contato')
      ) {
        newMap.customer_name = strIdx
      } else if (clean.includes('email') || clean.includes('e-mail')) {
        newMap.customer_email = strIdx
      } else if (
        clean.includes('telefone') ||
        clean.includes('whatsapp') ||
        clean.includes('fone') ||
        clean.includes('celular')
      ) {
        newMap.customer_phone = strIdx
      } else if (
        clean.includes('valor') ||
        clean.includes('preco') ||
        clean.includes('preço') ||
        clean.includes('r$')
      ) {
        newMap.value = strIdx
      } else if (
        clean.includes('etapa') ||
        clean.includes('fase') ||
        clean.includes('estagio') ||
        clean.includes('estágio') ||
        clean.includes('status')
      ) {
        newMap.stage = strIdx
      } else if (
        clean.includes('prazo') ||
        clean.includes('fechamento') ||
        clean.includes('data') ||
        clean.includes('previsao')
      ) {
        newMap.expected_close_date = strIdx
      } else if (clean.includes('nota') || clean.includes('observa') || clean.includes('detalhe')) {
        newMap.notes = strIdx
      }
    })

    setMappings(newMap)
  }

  // Parses uploaded file
  const handleFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile.name.match(/\.(xlsx|csv|txt)$/i)) {
      toast({
        title: 'Formato não suportado',
        description: 'Envie uma planilha no formato .xlsx ou .csv com cabeçalhos.',
        variant: 'destructive',
      })
      return
    }

    try {
      const text = await uploadedFile.text()
      const parsedData = parseCSV(text)

      if (parsedData.length < 2) {
        toast({
          title: 'Arquivo sem dados suficientes',
          description: 'A planilha deve conter uma linha de cabeçalho e pelo menos um registro.',
          variant: 'destructive',
        })
        return
      }

      const headers = parsedData[0]
      const rows = parsedData.slice(1)

      setFile(uploadedFile)
      setRawHeaders(headers)
      setRawRows(rows)
      autoMapColumns(headers)
      setCurrentStep(2)
      toast({
        title: 'Arquivo carregado!',
        description: `${rows.length} linhas encontradas. Confira o mapeamento.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Não foi possível ler os dados da planilha.',
        variant: 'destructive',
      })
    }
  }

  // Map and validate rows whenever mappings or rawRows change
  useEffect(() => {
    if (currentStep !== 2 || rawRows.length === 0) return

    const validated: RowValidation[] = rawRows.map((row, idx) => {
      const rowNum = idx + 2 // considering 1-based header at line 1
      const errors: string[] = []

      // Extract fields from mapped indices
      const title = mappings.title !== '' ? (row[parseInt(mappings.title)] || '').trim() : ''
      const customerName =
        mappings.customer_name !== '' ? (row[parseInt(mappings.customer_name)] || '').trim() : ''
      const customerEmail =
        mappings.customer_email !== '' ? (row[parseInt(mappings.customer_email)] || '').trim() : ''
      const customerPhone =
        mappings.customer_phone !== '' ? (row[parseInt(mappings.customer_phone)] || '').trim() : ''
      const rawValue = mappings.value !== '' ? (row[parseInt(mappings.value)] || '').trim() : '0'
      const rawStage =
        mappings.stage !== '' ? (row[parseInt(mappings.stage)] || '').trim().toLowerCase() : 'lead'
      const rawDate =
        mappings.expected_close_date !== ''
          ? (row[parseInt(mappings.expected_close_date)] || '').trim()
          : ''
      const notes = mappings.notes !== '' ? (row[parseInt(mappings.notes)] || '').trim() : ''

      // Validations
      if (!title) {
        errors.push('Nome do negócio ausente')
      }
      if (!customerName) {
        errors.push('Nome do cliente ausente')
      }

      // Parse and validate numeric value
      let cleanVal = rawValue.replace(/[R$\s.]/g, '').replace(',', '.')
      let numVal = parseFloat(cleanVal)
      if (isNaN(numVal) || numVal < 0) {
        // try fallback
        numVal = parseFloat(rawValue)
        if (isNaN(numVal)) {
          errors.push('Valor monetário inválido')
          numVal = 0
        }
      }

      // Validate Stage
      let stage: DealStage = 'lead'
      if (
        ['lead', 'contato-feito', 'proposta', 'negociacao', 'ganho', 'perdido'].includes(rawStage)
      ) {
        stage = rawStage as DealStage
      } else if (rawStage.includes('contato')) {
        stage = 'contato-feito'
      } else if (rawStage.includes('propost')) {
        stage = 'proposta'
      } else if (rawStage.includes('negoc')) {
        stage = 'negociacao'
      } else if (rawStage.includes('ganh') || rawStage.includes('fechado')) {
        stage = 'ganho'
      } else if (rawStage.includes('perd') || rawStage.includes('cancel')) {
        stage = 'perdido'
      }

      return {
        rowNumber: rowNum,
        title,
        customerName,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        value: numVal,
        stage,
        expectedCloseDate: rawDate ? rawDate.split('T')[0] : undefined,
        notes: notes || undefined,
        isValid: errors.length === 0,
        errors,
      }
    })

    setValidatedRows(validated)
  }, [mappings, rawRows, currentStep])

  const validCount = validatedRows.filter((r) => r.isValid).length
  const invalidCount = validatedRows.filter((r) => !r.isValid).length

  // Executes the bulk import into deals + creates audit record
  const handleExecuteImport = async () => {
    if (validCount === 0) {
      toast({
        title: 'Nenhuma linha válida',
        description: 'Corrija o mapeamento das colunas para importar.',
        variant: 'destructive',
      })
      return
    }

    setIsImporting(true)
    setCurrentStep(3)
    setImportProgress(10)

    let success = 0
    let failed = 0
    const failedList: { rowNumber: number; title: string; reason: string }[] = []

    const targetOwner = isGestor ? selectedOwner : user?.id || ''

    const totalToProcess = validatedRows.length

    for (let i = 0; i < validatedRows.length; i++) {
      const row = validatedRows[i]
      if (!row.isValid) {
        failed++
        failedList.push({
          rowNumber: row.rowNumber,
          title: row.title,
          reason: row.errors.join('; '),
        })
        continue
      }

      try {
        await createDeal({
          title: row.title,
          customer_name: row.customerName,
          customer_email: row.customerEmail,
          customer_phone: row.customerPhone,
          value: row.value,
          stage: row.stage,
          owner: targetOwner,
          expected_close_date: row.expectedCloseDate
            ? `${row.expectedCloseDate} 00:00:00.000Z`
            : undefined,
          notes: row.notes,
        })
        success++
      } catch (err: any) {
        failed++
        failedList.push({
          rowNumber: row.rowNumber,
          title: row.title,
          reason: err.message || 'Erro ao persistir registro',
        })
      }

      // Update progress
      const currentPct = Math.round(((i + 1) / totalToProcess) * 90) + 10
      setImportProgress(currentPct)
    }

    // Save audit record to imports collection
    try {
      await createImportRecord({
        filename: file?.name || 'planilha_importada.xlsx',
        rows_total: totalToProcess,
        rows_imported: success,
        rows_failed: failed,
        imported_by: user?.id || '',
      })
      const updatedAudits = await getRecentImports(5)
      setRecentImports(updatedAudits)
    } catch (auditErr) {
      console.error('Audit record error:', auditErr)
    }

    setImportStats({
      total: totalToProcess,
      success,
      failed,
      failedList,
    })

    setIsImporting(false)
    setImportFinished(true)

    toast({
      title: 'Importação finalizada!',
      description: `${success} oportunidades criadas com sucesso no pipeline.`,
    })
  }

  const handleReset = () => {
    setFile(null)
    setRawHeaders([])
    setRawRows([])
    setValidatedRows([])
    setCurrentStep(1)
    setImportProgress(0)
    setIsImporting(false)
    setImportFinished(false)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1280px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E7E5E0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C2321] tracking-tight">
              Importar Negócios (.xlsx)
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Passo {currentStep} de 3
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5C6663] mt-0.5">
            Traga oportunidades em massa a partir de planilhas Excel ou CSV para o seu CRM.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={downloadTemplate}
          className="rounded-xl border-[#E7E5E0] bg-white text-[#1C2321] hover:bg-[#F6F5F2] font-bold text-xs gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-[#E4572E]" />
          <span>Baixar Modelo de Planilha</span>
        </Button>
      </div>

      {/* Wizard Progress Steps Indicator */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className={`p-3 rounded-xl border transition-all text-center ${
            currentStep === 1
              ? 'bg-[#1C2321] text-white border-[#1C2321] shadow-sm'
              : currentStep > 1
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-white text-slate-400 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-extrabold">1. Carregar Arquivo</span>
            {currentStep > 1 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border transition-all text-center ${
            currentStep === 2
              ? 'bg-[#1C2321] text-white border-[#1C2321] shadow-sm'
              : currentStep > 2
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-white text-slate-400 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-extrabold">2. Mapeamento & Prévia</span>
            {currentStep > 2 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border transition-all text-center ${
            currentStep === 3
              ? 'bg-[#1C2321] text-white border-[#1C2321] shadow-sm'
              : 'bg-white text-slate-400 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-extrabold">3. Resultado</span>
          </div>
        </div>
      </div>

      {/* STEP 1: Upload Zone */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              if (e.dataTransfer.files?.[0]) {
                handleFileUpload(e.dataTransfer.files[0])
              }
            }}
            className={`p-12 rounded-3xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center bg-white ${
              isDragging
                ? 'border-[#E4572E] bg-orange-50/50 scale-[1.01]'
                : 'border-[#E7E5E0] hover:border-slate-400'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-[#E4572E]/10 text-[#E4572E] flex items-center justify-center mb-4 shadow-inner">
              <Upload className="w-8 h-8" />
            </div>

            <h2 className="text-lg font-extrabold text-[#1C2321]">
              Arraste sua planilha .xlsx ou .csv aqui
            </h2>
            <p className="text-xs text-[#5C6663] max-w-md mt-1 mb-6">
              O sistema detectará automaticamente as colunas como Nome do Negócio, Cliente, Valor e
              Etapa.
            </p>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.csv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(e.target.files[0])
                  }
                }}
              />
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E4572E] hover:bg-[#C94F26] text-white font-bold text-sm shadow-md shadow-[#E4572E]/25 transition-all">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Selecionar Arquivo no Computador</span>
              </span>
            </label>
          </div>

          {/* Recent Imports Audit Table */}
          {recentImports.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-[#E7E5E0] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E7E5E0] pb-3">
                <History className="w-4 h-4 text-[#E4572E]" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#1C2321]">
                  Histórico de Auditoria de Importações
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E7E5E0] text-[10px] font-bold uppercase tracking-wider text-[#8A938F]">
                      <th className="pb-2.5">Arquivo</th>
                      <th className="pb-2.5">Data</th>
                      <th className="pb-2.5">Importados</th>
                      <th className="pb-2.5">Falhas</th>
                      <th className="pb-2.5">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E5E0]">
                    {recentImports.map((imp) => (
                      <tr key={imp.id} className="text-[#1C2321]">
                        <td className="py-2.5 font-bold flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[#E4572E]" />
                          <span>{imp.filename}</span>
                        </td>
                        <td className="py-2.5 text-[#5C6663] font-medium">
                          {formatDateBR(imp.created)}
                        </td>
                        <td className="py-2.5 font-extrabold text-[#2E9E8F] font-numeric">
                          {imp.rows_imported} de {imp.rows_total}
                        </td>
                        <td className="py-2.5 font-semibold text-red-600 font-numeric">
                          {imp.rows_failed || 0}
                        </td>
                        <td className="py-2.5 text-[#5C6663]">
                          {imp.expand?.imported_by?.name || 'Usuário'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Preview & Column Mapping */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Mapping Controls Box */}
          <div className="bg-white p-6 rounded-2xl border border-[#E7E5E0] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E5E0] pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#1C2321]">
                  Mapeamento de Colunas da Planilha
                </h2>
                <p className="text-xs text-[#5C6663] mt-0.5">
                  Associe as colunas do seu arquivo aos campos de negócio do FlowVendas.
                </p>
              </div>

              {/* Responsible seller selection for Gestores */}
              {isGestor && sellers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#5C6663]">Atribuir a:</span>
                  <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                    <SelectTrigger className="h-9 rounded-xl text-xs bg-[#F6F5F2] w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name || s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Field Map Selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C2321]">Nome do negócio *</label>
                <Select
                  value={mappings.title}
                  onValueChange={(val) => setMappings({ ...mappings, title: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-[#F6F5F2]">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C2321]">Cliente / Empresa *</label>
                <Select
                  value={mappings.customer_name}
                  onValueChange={(val) => setMappings({ ...mappings, customer_name: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-[#F6F5F2]">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C2321]">Valor (R$) *</label>
                <Select
                  value={mappings.value}
                  onValueChange={(val) => setMappings({ ...mappings, value: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-[#F6F5F2]">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C2321]">Etapa do Pipeline</label>
                <Select
                  value={mappings.stage}
                  onValueChange={(val) => setMappings({ ...mappings, stage: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-[#F6F5F2]">
                    <SelectValue placeholder="Padrão: Lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C2321]">E-mail</label>
                <Select
                  value={mappings.customer_email}
                  onValueChange={(val) => setMappings({ ...mappings, customer_email: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-[#F6F5F2]">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C2321]">Telefone / Celular</label>
                <Select
                  value={mappings.customer_phone}
                  onValueChange={(val) => setMappings({ ...mappings, customer_phone: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-[#F6F5F2]">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C2321]">Prazo Previsto</label>
                <Select
                  value={mappings.expected_close_date}
                  onValueChange={(val) => setMappings({ ...mappings, expected_close_date: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-[#F6F5F2]">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C2321]">Observações / Notas</label>
                <Select
                  value={mappings.notes}
                  onValueChange={(val) => setMappings({ ...mappings, notes: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-[#F6F5F2]">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Validation Summary Bar */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-[#E7E5E0]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{validCount} linhas válidas</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{invalidCount} com erros (serão ignoradas)</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="rounded-xl text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Voltar</span>
              </Button>

              <Button
                size="sm"
                onClick={handleExecuteImport}
                disabled={validCount === 0}
                className="rounded-xl bg-[#E4572E] hover:bg-[#C94F26] text-white font-bold text-xs gap-1.5 shadow-md shadow-[#E4572E]/20"
              >
                <span>Importar {validCount} Negócios</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Preview Table (First 10 Rows) */}
          <div className="bg-white p-6 rounded-2xl border border-[#E7E5E0] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1C2321]">
                Prévia da Validação (Primeiras 10 Linhas)
              </h3>
              <span className="text-xs text-[#8A938F]">
                Total: {validatedRows.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E7E5E0] text-[10px] font-bold uppercase tracking-wider text-[#8A938F]">
                    <th className="pb-2.5">Linha</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Negócio</th>
                    <th className="pb-2.5">Cliente</th>
                    <th className="pb-2.5">Valor (R$)</th>
                    <th className="pb-2.5">Etapa</th>
                    <th className="pb-2.5">Contato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E0]">
                  {validatedRows.slice(0, 10).map((row) => {
                    const stageConf = STAGE_MAP[row.stage] || STAGES[0]
                    return (
                      <tr
                        key={row.rowNumber}
                        className={row.isValid ? 'hover:bg-[#F6F5F2]' : 'bg-red-50/50 text-red-900'}
                      >
                        <td className="py-2.5 font-bold">{row.rowNumber}</td>
                        <td className="py-2.5">
                          {row.isValid ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                              OK
                            </span>
                          ) : (
                            <span
                              title={row.errors.join('; ')}
                              className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded cursor-help"
                            >
                              Erro ({row.errors[0]})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 font-bold max-w-[180px] truncate">
                          {row.title || <span className="text-red-500 italic">Vazio</span>}
                        </td>
                        <td className="py-2.5 max-w-[160px] truncate">
                          {row.customerName || <span className="text-red-500 italic">Vazio</span>}
                        </td>
                        <td className="py-2.5 font-extrabold font-numeric">
                          {formatBRL(row.value)}
                        </td>
                        <td className="py-2.5">
                          <span
                            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: `${stageConf.color}20`,
                              color: stageConf.color,
                            }}
                          >
                            {stageConf.label}
                          </span>
                        </td>
                        <td className="py-2.5 text-[#5C6663] truncate max-w-[140px]">
                          {row.customerEmail || row.customerPhone || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Progress & Finished Outcome */}
      {currentStep === 3 && (
        <div className="bg-white p-8 rounded-3xl border border-[#E7E5E0] shadow-sm space-y-6 text-center max-w-xl mx-auto">
          {!importFinished ? (
            <div className="space-y-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-[#E4572E]/10 text-[#E4572E] flex items-center justify-center mx-auto animate-pulse">
                <FileCheck className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-[#1C2321]">Importando oportunidades...</h2>
              <p className="text-xs text-[#5C6663]">
                Gravando registros no banco de dados em tempo real.
              </p>
              <Progress value={importProgress} className="h-3 rounded-full" />
              <span className="text-xs font-bold text-[#E4572E]">{importProgress}% concluído</span>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-[#1C2321]">Importação Concluída!</h2>
                <p className="text-xs text-[#5C6663] mt-1">
                  Os negócios já estão disponíveis no seu Plano de Ação e Dashboard.
                </p>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 uppercase block">
                    Criados com Sucesso
                  </span>
                  <span className="text-3xl font-extrabold text-emerald-700 font-numeric">
                    {importStats.success}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 uppercase block">
                    Linhas Ignoradas
                  </span>
                  <span className="text-3xl font-extrabold text-slate-700 font-numeric">
                    {importStats.failed}
                  </span>
                </div>
              </div>

              {/* Errors report if any */}
              {importStats.failedList.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900">
                      Ocorrências ({importStats.failedList.length})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadErrorLog(importStats.failedList)}
                      className="h-7 text-xs bg-white text-red-700 border-red-200"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>Baixar Relatório de Erros</span>
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto text-[11px] text-red-800 space-y-1">
                    {importStats.failedList.slice(0, 5).map((err, idx) => (
                      <div key={idx}>
                        • Linha {err.rowNumber}: {err.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="rounded-xl text-xs font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  <span>Nova Importação</span>
                </Button>

                <Button
                  onClick={() => {
                    window.location.href = '/pipeline'
                  }}
                  className="rounded-xl bg-[#E4572E] hover:bg-[#C94F26] text-white font-bold text-xs shadow-md shadow-[#E4572E]/25"
                >
                  <span>Ver no Pipeline (Kanban)</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Importar
