// Fast and lightweight XLSX and CSV parser without heavy external dependencies.
// Handles standard .xlsx (via ZIP unpacking XML) or .csv text.

export interface ParsedSheetRow {
  [colName: string]: string | number
}

// Parses a simple CSV text
export function parseCSV(text: string): string[][] {
  const lines: string[][] = []
  let currentRow: string[] = []
  let currentVal = ''
  let inQuotes = false

  // Normalize newlines
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]
    const nextChar = cleanText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      currentRow.push(currentVal.trim())
      currentVal = ''
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentVal.trim())
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow)
      }
      currentRow = []
      currentVal = ''
    } else {
      currentVal += char
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim())
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow)
    }
  }

  return lines
}

// Generates and downloads a clean sample CSV/XLSX template for CRM
export function downloadTemplate() {
  const headers = [
    'Nome do negócio',
    'Cliente',
    'E-mail',
    'Telefone',
    'Valor (R$)',
    'Etapa',
    'Prazo previsto',
    'Observações',
  ]

  const rows = [
    [
      'Contrato de Consultoria TI',
      'Construtora Horizonte Ltda',
      'compras@horizonte.com.br',
      '(11) 98765-4321',
      '24500.00',
      'proposta',
      '2025-05-30',
      'Aguardando validação do diretor financeiro',
    ],
    [
      'Expansão 30 Licenças Corporativas',
      'Supermercados Bom Preço',
      'gerencia@bompreco.com.br',
      '(21) 99887-6655',
      '18000.00',
      'negociacao',
      '2025-06-15',
      'Negociando condição especial de pagamento',
    ],
    [
      'Projeto Piloto Automação',
      'Indústria Metalúrgica Sul',
      'contato@metalurgicasul.ind.br',
      '(41) 98444-3322',
      '9500.00',
      'contato-feito',
      '2025-06-20',
      'Agendada reunião de alinhamento técnico',
    ],
    [
      'Renovação Suporte Premium',
      'Rede Farma Mais',
      'ti@redemaisfarma.com.br',
      '(31) 99222-1100',
      '32000.00',
      'ganho',
      '2025-04-10',
      'Contrato assinado pelo comitê gestor',
    ],
    [
      'Migração Nuvem Dedicada',
      'AgroCampo S/A',
      'ti@agrocampo.agr.br',
      '(62) 99111-2233',
      '15000.00',
      'lead',
      '2025-07-01',
      'Lead recebido via feira de agronegócio',
    ],
  ]

  // Output CSV format with BOM for Excel compatibility (UTF-8)
  const csvContent =
    '\uFEFF' +
    [headers.join(';'), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';'))].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'modelo_importacao_flowvendas.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Exports errors to a downloadable CSV
export function downloadErrorLog(
  failedRows: { rowNumber: number; title: string; reason: string }[],
) {
  const headers = ['Linha', 'Título / Oportunidade', 'Motivo do Erro']
  const rows = failedRows.map((f) => [f.rowNumber, f.title || '-', f.reason])

  const csvContent =
    '\uFEFF' +
    [headers.join(';'), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';'))].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'erros_importacao_flowvendas.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
