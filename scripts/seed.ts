import { db } from '../lib/db'

async function main() {
  // Criar categorias
  const categorias = [
    { name: 'Limites Administrativos', description: 'Limites territoriais e divisões administrativas' },
    { name: 'Infraestruturas', description: 'Infraestruturas urbanas e rurais' },
    { name: 'Ambiente', description: 'Dados ambientais e de conservação' },
    { name: 'Agricultura', description: 'Dados agrícolas e uso da terra' },
    { name: 'Populacao', description: 'Dados populacionais e demográficos' },
    { name: 'Servicos', description: 'Serviços públicos e privados' },
    { name: 'Uso e Cobertura', description: 'Uso da terra e cobertura vegetal' },
    { name: 'Saneamento', description: 'Sistemas de saneamento básico' },
    { name: 'Wildlife', description: 'Fauna e flora silvestres' },
    { name: 'Hidrografia', description: 'Corpos d\'água e recursos hídricos' },
    { name: 'Clima', description: 'Dados climáticos e meteorológicos' },
    { name: 'Economia', description: 'Indicadores econômicos e financeiros' },
    { name: 'Turismo', description: 'Atrações turísticas e infraestrutura' },
  ]

  for (const cat of categorias) {
    await db.execute(
      `INSERT INTO Category (name, description, dataType, createdAt, updatedAt)
       VALUES (?, ?, 'geoespacial', NOW(), NOW())
       ON DUPLICATE KEY UPDATE updatedAt = NOW()`,
      [cat.name, cat.description]
    )
  }

  console.log('Categorias criadas com sucesso!')

  // Criar datasets de exemplo
  const [catRows] = await db.execute(
    'SELECT id FROM Category WHERE name = ? LIMIT 1',
    ['Infraestruturas']
  ) as any
  const infraestruturas = catRows[0] || null

  if (infraestruturas) {
    const datasets = [
      {
        title: 'Rede Viária Municipal',
        description: 'Mapa completo da rede viária do município incluindo estradas, avenidas e ruas principais.',
        categoryId: infraestruturas.id,
        source: 'Secretaria de Obras',
        year: 2023,
        format: 'SHP',
        fileSize: '15.2 MB',
        filePath: '/uploads/rede_viaria.shp',
        keywords: 'estradas, vias, transporte, infraestrutura',
      },
      {
        title: 'Pontos de Ônibus',
        description: 'Localização de todos os pontos de ônibus da cidade com informações de rotas.',
        categoryId: infraestruturas.id,
        source: 'Secretaria de Transportes',
        year: 2023,
        format: 'GeoJSON',
        fileSize: '2.1 MB',
        filePath: '/uploads/pontos_onibus.geojson',
        keywords: 'transporte público, ônibus, mobilidade',
      },
    ]

    for (const dataset of datasets) {
      await db.execute(
        `INSERT INTO Dataset
          (title, description, categoryId, source, year, format, fileSize, filePath, keywords, dataType, views, downloads, createdAt, updatedAt)
         VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, 'geoespacial', 0, 0, NOW(), NOW())`,
        [
          dataset.title,
          dataset.description,
          dataset.categoryId,
          dataset.source,
          dataset.year,
          dataset.format,
          dataset.fileSize,
          dataset.filePath,
          dataset.keywords,
        ]
      )
    }

    console.log('Datasets de exemplo criados!')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {})













