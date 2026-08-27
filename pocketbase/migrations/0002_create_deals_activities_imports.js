migrate(
  (app) => {
    // 1. deals collection
    const deals = new Collection({
      name: 'deals',
      type: 'base',
      listRule:
        '@request.auth.id != "" && (@request.auth.role = "gestor" || owner.id = @request.auth.id)',
      viewRule:
        '@request.auth.id != "" && (@request.auth.role = "gestor" || owner.id = @request.auth.id)',
      createRule: '@request.auth.id != ""',
      updateRule:
        '@request.auth.id != "" && (@request.auth.role = "gestor" || owner.id = @request.auth.id)',
      deleteRule:
        '@request.auth.id != "" && (@request.auth.role = "gestor" || owner.id = @request.auth.id)',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'customer_name', type: 'text', required: true },
        { name: 'customer_email', type: 'email' },
        { name: 'customer_phone', type: 'text' },
        { name: 'value', type: 'number', required: true },
        {
          name: 'stage',
          type: 'select',
          required: true,
          values: ['lead', 'contato-feito', 'proposta', 'negociacao', 'ganho', 'perdido'],
          maxSelect: 1,
        },
        {
          name: 'owner',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'expected_close_date', type: 'date' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_deals_stage ON deals (stage)',
        'CREATE INDEX idx_deals_owner ON deals (owner)',
        'CREATE INDEX idx_deals_created ON deals (created DESC)',
        'CREATE INDEX idx_deals_owner_stage ON deals (owner, stage)',
      ],
    })
    app.save(deals)

    const dealsId = app.findCollectionByNameOrId('deals').id

    // 2. activities collection
    const activities = new Collection({
      name: 'activities',
      type: 'base',
      listRule:
        '@request.auth.id != "" && (@request.auth.role = "gestor" || deal.owner.id = @request.auth.id || created_by.id = @request.auth.id)',
      viewRule:
        '@request.auth.id != "" && (@request.auth.role = "gestor" || deal.owner.id = @request.auth.id || created_by.id = @request.auth.id)',
      createRule: '@request.auth.id != ""',
      updateRule:
        '@request.auth.id != "" && (@request.auth.role = "gestor" || deal.owner.id = @request.auth.id || created_by.id = @request.auth.id)',
      deleteRule:
        '@request.auth.id != "" && (@request.auth.role = "gestor" || deal.owner.id = @request.auth.id || created_by.id = @request.auth.id)',
      fields: [
        {
          name: 'deal',
          type: 'relation',
          required: true,
          collectionId: dealsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['chamada', 'email', 'reuniao', 'nota'],
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'done', type: 'bool' },
        { name: 'due_date', type: 'date' },
        {
          name: 'created_by',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_activities_deal ON activities (deal)',
        'CREATE INDEX idx_activities_created ON activities (created DESC)',
      ],
    })
    app.save(activities)

    // 3. imports collection
    const imports = new Collection({
      name: 'imports',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule:
        '@request.auth.id != "" && (@request.auth.role = "gestor" || imported_by.id = @request.auth.id)',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && @request.auth.role = "gestor"',
      deleteRule: '@request.auth.id != "" && @request.auth.role = "gestor"',
      fields: [
        { name: 'filename', type: 'text', required: true },
        { name: 'rows_total', type: 'number', required: true },
        { name: 'rows_imported', type: 'number', required: true },
        { name: 'rows_failed', type: 'number' },
        {
          name: 'imported_by',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_imports_imported_by ON imports (imported_by)',
        'CREATE INDEX idx_imports_created ON imports (created DESC)',
      ],
    })
    app.save(imports)
  },
  (app) => {
    try {
      const imports = app.findCollectionByNameOrId('imports')
      app.delete(imports)
    } catch (_) {}

    try {
      const activities = app.findCollectionByNameOrId('activities')
      app.delete(activities)
    } catch (_) {}

    try {
      const deals = app.findCollectionByNameOrId('deals')
      app.delete(deals)
    } catch (_) {}
  },
)
