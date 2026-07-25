/**
 * Gera Memória Descritiva INTIC — Portal de Dados (Data4Moz)
 * Baseado exclusivamente na implementação existente no repositório.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'docs')
const OUT_FILE = path.join(OUT_DIR, 'Memoria-Descritiva-Portal-de-Dados-INTIC.docx')

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } })
}
function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } })
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: opts.center ? AlignmentType.CENTER : undefined,
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size })],
  })
}
function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } })
}
function mono(text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, font: 'Consolas', size: 20 })],
  })
}
function blank() {
  return new Paragraph({ text: '', spacing: { after: 80 } })
}

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({ text: 'MEMÓRIA DESCRITIVA', bold: true, size: 32 }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({ text: 'Portal de Dados — Data4Moz', bold: true, size: 28 }),
    ],
  }),
  p('Documento técnico elaborado com base na análise do código-fonte e da arquitectura implementada.', { italics: true }),
  p('Versão do projecto: 1.0.0 (package.json) · Stack: Next.js 14 Full Stack · Base de dados: MySQL'),
  blank(),

  h1('1. Serviços Prestados'),
  h2('1.1. Objecto e finalidade'),
  p('O Portal de Dados (DataPortal) é uma plataforma web aberta desenvolvida pela Data4Moz que centraliza a publicação, consulta e descarregamento de datasets, dashboards alfanuméricos, mapas inteligentes com painéis analíticos, relatórios e mecanismos de contacto. A aplicação destina-se a disponibilizar informação territorial e estatística de forma acessível a instituições, academia, empresas e sociedade civil.'),
  h2('1.2. Tipos de utilizadores'),
  bullet('Visitantes (público): acedem sem autenticação a catálogos, mapas, dashboards, relatórios, pesquisa e formulários de contacto/pedidos.'),
  bullet('Administrador: único perfil autenticado existente no sistema. Não há registo nem contas de utilizador comum. O administrador gere conteúdos via painel em /admin e consulta estatísticas em /dashboard.'),
  h2('1.3. Serviços e funcionalidades implementadas'),
  h3('1.3.1. Página inicial'),
  bullet('Apresentação institucional (Hero, Sobre, Funcionalidades, FAQ, parceiros).'),
  bullet('Estatísticas agregadas da base de dados: total de datasets, visualizações, downloads e número de fontes/organizações (app/page.tsx).'),
  bullet('Catálogo em destaque com datasets mais consultados.'),
  bullet('Pesquisa unificada com sugestões (SearchSuggestionsPopover + API /api/search/suggestions).'),
  h3('1.3.2. Catálogo de datasets'),
  bullet('/dados-espaciais — catálogo geoespacial com filtros, pesquisa, pré-visualização em mapa (Leaflet) e paginação infinita (components/geo/).'),
  bullet('/dados-alfanumericos — catálogo alfanumérico com filtros e listagem (components/alf/).'),
  bullet('/catalogo — catálogo unificado de datasets.'),
  bullet('/dataset/[id] — página de detalhe com metadados, pré-visualização de ficheiros (CSV, Excel, GeoJSON, shapefile ZIP via shpjs), checksum SHA-256 e descarregamento.'),
  bullet('Tipos de dados suportados na base de dados: dataType = geoespacial | alfanumerico (lib/db.ts).'),
  h3('1.3.3. Descarregamento e estatísticas de utilização'),
  bullet('GET /api/download/[id] — entrega o ficheiro armazenado em public/uploads/ e incrementa contadores de downloads.'),
  bullet('Registo de visualizações e downloads por dataset (campos views/downloads e tabela Statistic).'),
  bullet('GET /api/datasets/[id]/preview — pré-visualização tabular ou geográfica.'),
  bullet('GET /api/datasets/[id]/checksum — hash SHA-256 do ficheiro para verificação de integridade.'),
  h3('1.3.4. Dashboards alfanuméricos'),
  bullet('/dashboards-alfanumericos — galeria de painéis externos (Power BI, ArcGIS, etc.) registados na tabela AlphanumericDashboard.'),
  bullet('Integração por URL de embed (lib/dashboard-utils.ts) com pré-visualização em iframe ou imagem.'),
  bullet('Contador de visualizações por clique em «Ver mais» (POST /api/alphanumeric-dashboards/[id]/view).'),
  h3('1.3.5. Mapas inteligentes (mapas + dashboards geoespaciais)'),
  bullet('/maps — catálogo estático de experiências publicadas (lib/maps-catalog.ts).'),
  bullet('Quatro mapas implementados, cada um com componente React dedicado e ficheiros de dados em public/data/:'),
  bullet('  • mapa-de-saude — Mapa Inteligente de Saúde Pública (health-adm3.geojson).'),
  bullet('  • diagnostico-rede-postes — Análise e Diagnóstico da Infraestrutura Eléctrica (poles-network.json).'),
  bullet('  • malaria-geografia-2015-2018 — Série Temporal e Geográfica de Incidência de Malária (malaria-provinces.json).'),
  bullet('  • feederpulse-mz — FeederPulse-MZ, inteligência energética (feeder-pulse.json).'),
  bullet('Visualização com Leaflet, gráficos Recharts/Chart.js, KPIs e filtros conforme cada dashboard.'),
  h3('1.3.6. Relatórios'),
  bullet('/relatorios e /relatorios/[id] — listagem e detalhe de relatórios (tabela Report).'),
  bullet('Pedido de acesso/informação via ReportRequestButton → POST /api/report-requests (registo na tabela ReportRequest).'),
  h3('1.3.7. Contacto e comunicação'),
  bullet('Modal de contacto global (ContactModalProvider, ContactFloatingButton).'),
  bullet('POST /api/contact — grava mensagem na tabela ContactMessage; envio opcional por e-mail via SMTP (Nodemailer, lib/mailer.ts).'),
  bullet('Rate limiting: 5 pedidos/hora por IP para contacto.'),
  h3('1.3.8. Páginas institucionais e legal'),
  bullet('/termos-condicoes e /politica-cookies — termos e política de cookies.'),
  bullet('TermsConsentModal — registo de consentimento em localStorage (dataPortalTermsConsent).'),
  bullet('/ai-insights — página informativa/demo sobre capacidades de IA (sem backend de IA implementado).'),
  h3('1.3.9. Administração (requer autenticação)'),
  bullet('/admin/login — autenticação do administrador.'),
  bullet('/admin — painel CRUD: datasets, categorias, relatórios, dashboards alfanuméricos (AdminPanel).'),
  bullet('/dashboard — painel analítico com gráficos de utilização (ModernDashboard).'),
  bullet('Upload de ficheiros via POST /api/upload (máx. 100 MB, autenticação obrigatória).'),
  bullet('Exportação de relatórios administrativos: JSON, CSV (GET /api/admin/reports) e PDF (GET /api/admin/reports/pdf, jsPDF).'),
  bullet('Analytics: GET /api/admin/analytics — top downloads/visualizações e série temporal.'),
  h2('1.4. Funcionalidades não implementadas (transparência técnica)'),
  bullet('Registo ou autenticação de utilizadores finais (apenas administrador).'),
  bullet('Módulo AI Insights operacional (apenas página promocional).'),
  bullet('NextAuth — variável NEXTAUTH_URL documentada em .env.example mas não utilizada; autenticação é JWT customizada.'),
  bullet('Scripts automatizados de backup da base de dados ou ficheiros (não existem no repositório).'),

  h1('2. Aspectos Técnicos da Arquitectura e dos Sistemas de Informação'),
  h2('2.1. Stack tecnológica'),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell('Camada', true),
          cell('Tecnologia', true),
          cell('Evidência', true),
        ],
      }),
      row3('Runtime / Framework', 'Node.js, Next.js 14.2 (App Router)', 'package.json, app/'),
      row3('Front-end', 'React 18, TypeScript, Tailwind CSS 4', 'components/, tailwind.config.ts'),
      row3('Back-end', 'Next.js Route Handlers (app/api/)', '23 rotas API'),
      row3('Base de dados', 'MySQL (mysql2/promise, pool)', 'lib/db.ts, DATABASE_URL'),
      row3('Autenticação', 'JWT (jsonwebtoken) + cookie httpOnly', 'lib/auth.ts'),
      row3('Palavras-passe', 'bcryptjs (cost factor 10)', 'app/api/auth/login, scripts/create-admin.ts'),
      row3('Mapas', 'Leaflet, react-leaflet', 'components/maps/, components/geo/'),
      row3('Gráficos', 'Recharts, Chart.js, react-chartjs-2', 'components/maps/, ModernDashboard'),
      row3('Relatórios PDF', 'jsPDF, jspdf-autotable', 'app/api/admin/reports/pdf/route.ts'),
      row3('E-mail', 'Nodemailer (SMTP)', 'lib/mailer.ts'),
      row3('Ficheiros geo', 'shpjs (shapefile), xlsx (Excel)', 'app/api/datasets/[id]/preview/route.ts'),
    ],
  }),
  blank(),
  h2('2.2. Arquitectura geral'),
  p('O sistema adopta uma arquitectura monolítica full-stack em Next.js: páginas React (Server e Client Components) coexistem com Route Handlers REST na mesma aplicação. A lógica de persistência concentra-se em lib/db.ts com SQL parametrizado. Não existe camada ORM activa em runtime (existem migrações SQL em prisma/migrations/ apenas como referência de schema).'),
  h2('2.3. Comunicação Front-end ↔ Back-end'),
  bullet('Páginas server-side acedem directamente a lib/db.ts (ex.: app/page.tsx, catálogos).'),
  bullet('Componentes client-side invocam fetch() às rotas /api/* (login, CRUD admin, contacto, pesquisa, preview, download).'),
  bullet('Server Actions em app/dataset/[id]/actions.ts para registo de visualizações.'),
  bullet('Autenticação admin: POST /api/auth/login define cookie auth-token; pedidos autenticados leem cookie no servidor via getCurrentUser().'),
  h2('2.4. Comunicação com MySQL'),
  bullet('Pool de ligações: connectionLimit 10, uri = process.env.DATABASE_URL (lib/db.ts).'),
  bullet('Todas as queries utilizam placeholders ? (prepared statements) — protecção contra SQL injection.'),
  bullet('Cache em memória de 60 segundos para listagens de datasets (datasetsQueryCache).'),
  bullet('Migrações runtime: ensureCategoryCompositeUnique(), ensureAlphanumericDashboardTable().'),
  h2('2.5. Organização de pastas'),
  mono('app/          — Rotas, layouts, API (App Router)'),
  mono('components/   — UI React (geo, alf, maps, dashboards, admin, …)'),
  mono('lib/          — db, auth, security, mailer, maps-catalog, portal-search'),
  mono('public/       — Imagens, uploads/, data/ (JSON/GeoJSON estáticos)'),
  mono('prisma/migrations/ — SQL de schema inicial'),
  mono('scripts/      — create-admin, seed, extracção de dados'),
  mono('middleware.ts — Headers de segurança e CORS'),
  mono('next.config.js — CSP, HSTS, external packages'),
  h2('2.6. Modelo de dados (tabelas)'),
  bullet('User — administradores (email único, password hash).'),
  bullet('Category — categorias com dataType (geoespacial, alfanumerico, dashboard).'),
  bullet('Dataset — metadados e filePath para ficheiros em public/.'),
  bullet('Statistic — eventos view/download por dataset.'),
  bullet('Report — relatórios publicados.'),
  bullet('ReportRequest — pedidos de relatório (criada em runtime, sem migração SQL no repo).'),
  bullet('ContactMessage — mensagens do formulário de contacto.'),
  bullet('AlphanumericDashboard — dashboards externos embedáveis.'),

  h1('3. Descrição e Diagramas da Infraestrutura Tecnológica'),
  h2('3.1. Componentes de infraestrutura'),
  p('A aplicação é uma aplicação web Node.js que pode ser executada em modo desenvolvimento (next dev), produção (next start) ou via server.js (servidor HTTP customizado com PORT configurável).'),
  h2('3.2. Diagrama de fluxo (ASCII)'),
  mono('┌─────────────┐'),
  mono('│ Utilizador  │  (browser — visitante ou administrador)'),
  mono('└──────┬──────┘'),
  mono('       │ HTTPS (produção) / HTTP (desenvolvimento)'),
  mono('       ▼'),
  mono('┌─────────────┐'),
  mono('│  Navegador  │  React 18 · HTML/CSS/JS · Leaflet · fetch API'),
  mono('└──────┬──────┘'),
  mono('       │'),
  mono('       ▼'),
  mono('┌─────────────────────────────────────────────┐'),
  mono('│           Next.js 14 (Full Stack)          │'),
  mono('│  ┌─────────────┐    ┌─────────────────────┐ │'),
  mono('│  │ App Router  │    │ Route Handlers      │ │'),
  mono('│  │ (pages SSR/ │    │ /api/* (REST)       │ │'),
  mono('│  │  client)    │    │ middleware.ts       │ │'),
  mono('│  └──────┬──────┘    └──────────┬──────────┘ │'),
  mono('│         │                      │            │'),
  mono('│         └──────────┬───────────┘            │'),
  mono('│                    ▼                        │'),
  mono('│              lib/db.ts · lib/auth.ts        │'),
  mono('└────────────────────┬────────────────────────┘'),
  mono('                         │ mysql2 pool'),
  mono('                         ▼'),
  mono('                  ┌─────────────┐'),
  mono('                  │    MySQL    │  DATABASE_URL'),
  mono('                  └─────────────┘'),
  mono(''),
  mono('Armazenamento de ficheiros: public/uploads/ (datasets/relatórios)'),
  mono('Dados estáticos de mapas: public/data/*.json|geojson'),
  h2('3.3. Serviços externos'),
  bullet('MySQL — base de dados relacional (obrigatório).'),
  bullet('SMTP — envio de e-mails do formulário de contacto (opcional; CONTACT_RECIPIENT_EMAIL, SMTP_*).'),
  bullet('OpenStreetMap / OpenTopoMap / ArcGIS Online — tiles de mapas (client-side, CSP allowlist).'),
  bullet('Power BI / ArcGIS — embeds de dashboards alfanuméricos (frame-src na CSP).'),
  bullet('unpkg.com — permitido na CSP para imagens (configuração next.config.js).'),
  h2('3.4. Alojamento e armazenamento'),
  bullet('Aplicação: qualquer ambiente Node.js capaz de executar Next.js 14 (VPS, cloud, PaaS — ex.: Vercel referenciado em lib/site.ts via VERCEL_URL).'),
  bullet('URL de produção configurável: NEXT_PUBLIC_SITE_URL (fallback documentado: https://dataportal.co.mz).'),
  bullet('Dados estruturados: servidor MySQL acessível via DATABASE_URL.'),
  bullet('Ficheiros binários: sistema de ficheiros local em public/uploads/ no servidor da aplicação.'),
  bullet('Dados estáticos de mapas analíticos: public/data/ incluídos no deploy.'),

  h1('4. Aspectos de Segurança dos Sistemas de Informação'),
  h2('4.1. Autenticação e controlo de acesso'),
  bullet('Login exclusivo de administrador: POST /api/auth/login com email + password.'),
  bullet('JWT assinado com JWT_SECRET, validade 7 dias, payload { userId, email }.'),
  bullet('Cookie auth-token: httpOnly, secure em produção, sameSite strict (prod) / lax (dev), path=/.'),
  bullet('Em produção, recusa arranque/verificação se JWT_SECRET mantiver valor por defeito inseguro (lib/auth.ts).'),
  bullet('Rotas /admin e /dashboard protegidas server-side com getCurrentUser() + redirect para /admin/login.'),
  bullet('Operações de escrita (POST/PUT/DELETE) nas APIs verificam getCurrentUser() individualmente.'),
  bullet('Nota: middleware.ts não bloqueia /admin; a protecção é feita nas páginas e APIs, não na middleware.'),
  h2('4.2. Palavras-passe'),
  bullet('Armazenamento com bcrypt (bcryptjs), factor de custo 10.'),
  bullet('Script create-admin exige password forte: ≥12 caracteres, maiúsculas, minúsculas, dígito e símbolo (isStrongPassword em lib/security.ts).'),
  h2('4.3. Protecção de inputs e abusos'),
  bullet('SQL injection: queries parametrizadas em lib/db.ts e rotas API.'),
  bullet('Validação: normalizeText (limite de comprimento), normalizeEmail, isValidEmail.'),
  bullet('Rate limiting em memória (lib/security.ts): login 10/15 min/IP; contacto 5/h/IP; report-requests 20/h/IP.'),
  bullet('Upload: requer autenticação; limite 100 MB; nomes únicos com timestamp — sem whitelist de MIME/extensão documentada.'),
  h2('4.4. Headers HTTP e políticas'),
  bullet('middleware.ts: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy.'),
  bullet('next.config.js: Strict-Transport-Security (HSTS), Content-Security-Policy restrictiva.'),
  bullet('CORS configurável via CORS_ALLOWED_ORIGINS para rotas /api/*.'),
  bullet('poweredByHeader: false (oculta X-Powered-By).'),
  h2('4.5. XSS e exposição'),
  bullet('React escapa conteúdo por defeito; não foi identificada biblioteca de sanitização HTML adicional.'),
  bullet('robots.ts: disallow /admin, /dashboard, /api/ para indexação.'),
  h2('4.6. HTTPS'),
  bullet('HSTS configurado globalmente; cookie secure activo em NODE_ENV=production.'),
  bullet('Implementação efectiva de HTTPS depende do reverse proxy / alojamento em produção.'),

  h1('5. Aspectos de Proteção de Dados'),
  h2('5.1. Armazenamento'),
  bullet('Metadados de catálogo, utilizadores admin, mensagens de contacto e pedidos: MySQL (utf8mb4).'),
  bullet('Ficheiros de datasets e relatórios: disco local public/uploads/, referenciados por filePath na base de dados.'),
  bullet('Dados analíticos de mapas publicados: ficheiros estáticos em public/data/.'),
  bullet('Consentimento de termos: localStorage no browser (TermsConsentModal).'),
  h2('5.2. Quem acede aos dados'),
  bullet('Público: consulta e descarregamento de datasets/relatórios publicados; submissão de contacto e pedidos de relatório.'),
  bullet('Administrador autenticado: CRUD completo, upload, analytics e exportações administrativas.'),
  bullet('Base de dados e uploads: acesso restrito à infraestrutura de alojamento e credenciais DATABASE_URL / servidor.'),
  h2('5.3. Confidencialidade, integridade e disponibilidade'),
  bullet('Confidencialidade: passwords hash bcrypt; JWT em cookie httpOnly; APIs admin autenticadas; segredos em variáveis de ambiente (.env, não commitados).'),
  bullet('Integridade: checksum SHA-256 disponível por dataset (GET /api/datasets/[id]/checksum); validação de inputs; SQL parametrizado.'),
  bullet('Disponibilidade: pool MySQL com limite de ligações; cache de leitura de datasets (60s); dependência de disponibilidade do servidor MySQL e do host da aplicação.'),
  h2('5.4. Backup'),
  p('O repositório não inclui scripts automatizados de backup da base de dados nem dos ficheiros em public/uploads/. A política de backup deve ser definida ao nível da infraestrutura de alojamento (snapshots MySQL, cópias periódicas do filesystem).'),
  h2('5.5. Boas práticas adoptadas no projecto'),
  bullet('Segredos externalizados (.env.example como modelo, sem credenciais reais).'),
  bullet('Princípio de mínimo privilégio na API: operações sensíveis exigem sessão admin.'),
  bullet('Limitação de taxa em endpoints públicos expostos a abuso (login, contacto, pedidos).'),
  bullet('Política de cookies e termos publicadas; modal de consentimento na primeira visita.'),
  bullet('Metadados descritivos por dataset (fonte, cobertura, ano, keywords) para reutilização responsável.'),

  h1('6. Anexos técnicos'),
  h2('6.1. Rotas API (inventário)'),
  mono('POST   /api/auth/login          /api/auth/logout'),
  mono('GET/POST /api/categories      PUT/DELETE /api/categories/[id]'),
  mono('GET/POST /api/datasets        PUT/DELETE /api/datasets/[id]'),
  mono('GET    /api/datasets/count    /api/datasets/[id]/preview'),
  mono('GET    /api/datasets/[id]/checksum   /api/download/[id]'),
  mono('POST   /api/upload           /api/contact'),
  mono('GET/POST /api/reports       PUT/DELETE /api/reports/[id]'),
  mono('POST   /api/report-requests'),
  mono('GET/POST /api/alphanumeric-dashboards  PUT/DELETE /api/alphanumeric-dashboards/[id]'),
  mono('POST   /api/alphanumeric-dashboards/[id]/view'),
  mono('GET    /api/dashboard-categories   /api/search/suggestions'),
  mono('GET    /api/admin/analytics  /api/admin/reports  /api/admin/reports/pdf'),
  h2('6.2. Variáveis de ambiente (.env.example)'),
  mono('DATABASE_URL, JWT_SECRET, CONTACT_RECIPIENT_EMAIL'),
  mono('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE'),
  mono('CORS_ALLOWED_ORIGINS, NEXTAUTH_URL (não usado pela auth actual)'),
  mono('Adicionalmente no código: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_PORTAL_EMAIL, VERCEL_URL, NODE_ENV, PORT'),
  blank(),
  p('— Fim da Memória Descritiva —', { center: true, italics: true }),
  p('Elaborado com base na análise do código-fonte do projecto DataPortal (Data4Moz).', { center: true, size: 20 }),
]

function cell(text, header = false) {
  return new TableCell({
    shading: header ? { fill: '064E2C', type: ShadingType.CLEAR } : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: header, color: header ? 'FFFFFF' : undefined, size: 20 }),
        ],
      }),
    ],
  })
}

function row3(a, b, c) {
  return new TableRow({
    children: [cell(a), cell(b), cell(c)],
  })
}

const doc = new Document({
  creator: 'Data4Moz — Portal de Dados',
  title: 'Memória Descritiva — Portal de Dados INTIC',
  description: 'Documento técnico baseado na implementação real do sistema',
  sections: [{ properties: {}, children }],
})

fs.mkdirSync(OUT_DIR, { recursive: true })
const buffer = await Packer.toBuffer(doc)
fs.writeFileSync(OUT_FILE, buffer)
console.log('Documento gerado:', OUT_FILE)
