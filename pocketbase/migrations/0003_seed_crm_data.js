migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const dealsCol = app.findCollectionByNameOrId('deals')
    const activitiesCol = app.findCollectionByNameOrId('activities')

    // 1. Seed Thomaz (gestor)
    let gestorRecord
    try {
      gestorRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'thomazmcontato@hotmail.com')
      gestorRecord.set('role', 'gestor')
      gestorRecord.set('name', 'Thomaz')
      gestorRecord.setVerified(true)
      app.save(gestorRecord)
    } catch (_) {
      gestorRecord = new Record(users)
      gestorRecord.setEmail('thomazmcontato@hotmail.com')
      gestorRecord.setPassword('Skip@Pass')
      gestorRecord.setVerified(true)
      gestorRecord.set('name', 'Thomaz')
      gestorRecord.set('role', 'gestor')
      app.save(gestorRecord)
    }

    // 2. Seed Ana Souza (vendedora)
    let vendedorRecord
    try {
      vendedorRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'vendedora@demo.com')
      vendedorRecord.set('role', 'vendedor')
      vendedorRecord.set('name', 'Ana Souza')
      vendedorRecord.setVerified(true)
      app.save(vendedorRecord)
    } catch (_) {
      vendedorRecord = new Record(users)
      vendedorRecord.setEmail('vendedora@demo.com')
      vendedorRecord.setPassword('Skip@Pass')
      vendedorRecord.setVerified(true)
      vendedorRecord.set('name', 'Ana Souza')
      vendedorRecord.set('role', 'vendedor')
      app.save(vendedorRecord)
    }

    // 3. Seed 8 realistic deals distributed across all 6 stages
    const dealsData = [
      {
        title: 'Fechamento de contrato anual ERP',
        customer_name: 'Grupo Alvorada Logística',
        customer_email: 'compras@alvoradalog.com.br',
        customer_phone: '(11) 98765-4321',
        value: 45000,
        stage: 'ganho',
        owner: gestorRecord.id,
        expected_close_date: '2025-03-15',
        notes: 'Cliente aprovou proposta final com desconto de pontualidade. Contrato assinado.',
      },
      {
        title: 'Renovação de plano corporativo CRM',
        customer_name: 'TechNorte Soluções Digitais',
        customer_email: 'contato@technorte.com.br',
        customer_phone: '(92) 99123-8877',
        value: 28000,
        stage: 'negociacao',
        owner: vendedorRecord.id,
        expected_close_date: '2025-04-10',
        notes: 'Em alinhamento de cláusulas de SLA e faturamento semestral.',
      },
      {
        title: 'Implementação do sistema de gestão',
        customer_name: 'Fábrica São Jorge Alimentos',
        customer_email: 'diretoria@saojorgealimentos.com.br',
        customer_phone: '(19) 98234-5678',
        value: 36000,
        stage: 'proposta',
        owner: gestorRecord.id,
        expected_close_date: '2025-04-20',
        notes: 'Apresentação comercial realizada, aguardando parecer do comitê financeiro.',
      },
      {
        title: 'Módulo de automação de vendas e cobrança',
        customer_name: 'AgroCampo Insumos Agrícolas',
        customer_email: 'financeiro@agrocampo.agr.br',
        customer_phone: '(62) 99456-1122',
        value: 19500,
        stage: 'contato-feito',
        owner: vendedorRecord.id,
        expected_close_date: '2025-05-05',
        notes:
          'Primeira reunião de diagnóstico concluída. Validar requisitos de integração com ERP legado.',
      },
      {
        title: 'Licenciamento anual 50 usuários Flow',
        customer_name: 'Vanguard Engenharia e Obras',
        customer_email: 'ti@vanguardeng.com.br',
        customer_phone: '(31) 98899-7766',
        value: 15200,
        stage: 'lead',
        owner: vendedorRecord.id,
        expected_close_date: '2025-05-18',
        notes: 'Lead inbound qualificado via formulário web. Agendar call exploratória.',
      },
      {
        title: 'Consultoria de processos comerciais',
        customer_name: 'SulMinas Distribuidora',
        customer_email: 'operacoes@sulminasdist.com.br',
        customer_phone: '(35) 99788-3344',
        value: 8900,
        stage: 'proposta',
        owner: vendedorRecord.id,
        expected_close_date: '2025-04-25',
        notes: 'Proposta customizada enviada com 3 opções de pacote.',
      },
      {
        title: 'Expansão de licenças para equipe regional',
        customer_name: 'Rede Farma Mais',
        customer_email: 'gestao@redemaisfarma.com.br',
        customer_phone: '(41) 98455-9090',
        value: 32000,
        stage: 'ganho',
        owner: gestorRecord.id,
        expected_close_date: '2025-03-28',
        notes:
          'Aprovado pelo diretor regional. Início de onboarding marcado para a próxima semana.',
      },
      {
        title: 'Piloto de CRM para filial Nordeste',
        customer_name: 'Atlantis Logística Portuária',
        customer_email: 'suprimentos@atlantislog.com',
        customer_phone: '(81) 99233-4455',
        value: 12500,
        stage: 'perdido',
        owner: vendedorRecord.id,
        expected_close_date: '2025-03-01',
        notes:
          'Cliente optou por congelar projetos de TI no trimestre atual por reestruturação interna.',
      },
    ]

    for (let i = 0; i < dealsData.length; i++) {
      const item = dealsData[i]
      try {
        app.findFirstRecordByData('deals', 'title', item.title)
      } catch (_) {
        const record = new Record(dealsCol)
        record.set('title', item.title)
        record.set('customer_name', item.customer_name)
        record.set('customer_email', item.customer_email)
        record.set('customer_phone', item.customer_phone)
        record.set('value', item.value)
        record.set('stage', item.stage)
        record.set('owner', item.owner)
        record.set('expected_close_date', item.expected_close_date)
        record.set('notes', item.notes)
        app.save(record)
      }
    }

    // 4. Seed 6 activities on some deals
    let deal1, deal2, deal3
    try {
      deal1 = app.findFirstRecordByData('deals', 'title', 'Fechamento de contrato anual ERP')
    } catch (_) {}
    try {
      deal2 = app.findFirstRecordByData('deals', 'title', 'Renovação de plano corporativo CRM')
    } catch (_) {}
    try {
      deal3 = app.findFirstRecordByData('deals', 'title', 'Implementação do sistema de gestão')
    } catch (_) {}

    const activitiesData = [
      {
        dealId: deal1 ? deal1.id : null,
        type: 'reuniao',
        description:
          'Alinhamento com diretoria financeira sobre cronograma de faturamento e implantação',
        done: true,
        due_date: '2025-03-14',
        created_by: gestorRecord.id,
      },
      {
        dealId: deal1 ? deal1.id : null,
        type: 'email',
        description: 'Envio da minuta contratual assinada e dados cadastrais',
        done: true,
        due_date: '2025-03-15',
        created_by: gestorRecord.id,
      },
      {
        dealId: deal2 ? deal2.id : null,
        type: 'chamada',
        description: 'Ligação com o gerente de TI para tirar dúvidas da proposta técnica',
        done: false,
        due_date: '2025-04-08',
        created_by: vendedorRecord.id,
      },
      {
        dealId: deal2 ? deal2.id : null,
        type: 'nota',
        description: 'Cliente pediu flexibilidade para início em Maio. Preparar aditivo.',
        done: false,
        due_date: '2025-04-09',
        created_by: vendedorRecord.id,
      },
      {
        dealId: deal3 ? deal3.id : null,
        type: 'reuniao',
        description: 'Reunião de apresentação da demonstração prática para a equipe técnica',
        done: false,
        due_date: '2025-04-18',
        created_by: gestorRecord.id,
      },
      {
        dealId: deal3 ? deal3.id : null,
        type: 'email',
        description:
          'Follow-up de proposta comercial enviado com comparativo de retorno de investimento',
        done: true,
        due_date: '2025-04-02',
        created_by: gestorRecord.id,
      },
    ]

    for (let j = 0; j < activitiesData.length; j++) {
      const act = activitiesData[j]
      if (!act.dealId) continue
      try {
        app.findFirstRecordByData('activities', 'description', act.description)
      } catch (_) {
        const actRecord = new Record(activitiesCol)
        actRecord.set('deal', act.dealId)
        actRecord.set('type', act.type)
        actRecord.set('description', act.description)
        actRecord.set('done', act.done)
        actRecord.set('due_date', act.due_date)
        actRecord.set('created_by', act.created_by)
        app.save(actRecord)
      }
    }
  },
  (app) => {
    // rollback cleanup if needed
  },
)
