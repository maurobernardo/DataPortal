import type { Metadata } from 'next'
import { FileText, Download } from 'lucide-react'
import { LegalPageLayout, type LegalSection } from '@/components/legal/LegalPageLayout'

const PDF_PATH = '/images/Data4Moz_Ethical_Data_Collection_Guidelines_Bilingual_v1.0.pdf'

export const metadata: Metadata = {
  title: 'Abordagem Ética de Recolha de Dados · Data Portal',
  description:
    'Os princípios que orientam como o Data Portal recolhe, publica e trata dados: transparência de fonte, minimização, e nenhuma recolha de dados pessoais de terceiros sem consentimento.',
}

const ACTUALIZADO_EM = '23 de Agosto de 2026'
const VERSAO = '1.0'

const sections: LegalSection[] = [
  {
    id: 'porque-existe',
    numero: '1',
    titulo: 'Porque existe este documento',
    conteudo: (
      <>
        <p>
          O Data Portal agrega e publica dados de interesse público sobre Moçambique. Um portal
          deste tipo só é digno de confiança se for claro, não só sobre o que faz com os dados de
          quem o usa (isso está na <a href="/politica-privacidade">Política de Privacidade</a>),
          mas também sobre <strong>como e de onde vêm os dados que publica</strong> no catálogo.
          Este documento existe para quem precisa de avaliar essa segunda parte: investigadores,
          jornalistas, parceiros institucionais, ou qualquer pessoa a validar se o portal segue
          práticas éticas de recolha e publicação de dados.
        </p>

        <div className="legal-doc-pdf-card">
          <div className="legal-doc-pdf-card-icon">
            <FileText size={22} aria-hidden />
          </div>
          <div className="legal-doc-pdf-card-body">
            <p className="legal-doc-pdf-card-title">
              Diretrizes de Recolha Ética de Dados da Data4Moz (versão bilingue, PT/EN)
            </p>
            <p className="legal-doc-pdf-card-text">
              Documento oficial completo, versão 1.0, disponível em português e inglês. As secções
              abaixo resumem os pontos principais em português; o PDF é a referência completa.
            </p>
            <div className="legal-doc-pdf-card-actions">
              <a href={PDF_PATH} target="_blank" rel="noopener noreferrer">
                <FileText size={14} aria-hidden />
                Visualizar PDF
              </a>
              <a href={PDF_PATH} download>
                <Download size={14} aria-hidden />
                Descarregar PDF
              </a>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'principios',
    numero: '2',
    titulo: 'Princípios que seguimos',
    conteudo: (
      <ul>
        <li>
          <strong>Transparência de fonte</strong>: todo dataset publicado indica a instituição de
          origem, o ano e o formato. Nunca publicamos um dado sem saber e mostrar de onde veio.
        </li>
        <li>
          <strong>Sem recolha de dados pessoais de terceiros</strong>: o catálogo é composto por
          dados estatísticos e geoespaciais agregados (populações, infra-estruturas, produção,
          território), nunca por informação identificável de pessoas específicas recolhida sem o
          seu conhecimento.
        </li>
        <li>
          <strong>Minimização</strong>: dos utilizadores do próprio portal, recolhemos apenas o
          estritamente necessário para o serviço pedido (conta, autenticação, uso do AI Insights),
          nunca dados "por via das dúvidas". Detalhado na{' '}
          <a href="/politica-privacidade">Política de Privacidade</a>.
        </li>
        <li>
          <strong>Não redistribuição indevida</strong>: cada dataset é publicado com a licença ou
          condição de uso indicada pela entidade de origem; não removemos nem ignoramos essas
          condições ao publicar.
        </li>
        <li>
          <strong>Acesso equitativo</strong>: o catálogo, os mapas, os relatórios e a análise por
          IA estão disponíveis ao mesmo nível para qualquer utilizador registado, sem níveis pagos
          que limitem o acesso a quem pode pagar mais.
        </li>
        <li>
          <strong>Honestidade sobre incerteza</strong>: estimativas e projecções geradas por
          Inteligência Artificial são sempre identificadas como estimativas, nunca apresentadas
          como certezas ou como um dado oficial adicional.
        </li>
        <li>
          <strong>Correcção aberta</strong>: qualquer pessoa pode reportar um erro, uma fonte mal
          atribuída, ou uma preocupação ética sobre um dataset específico, pelos contactos no fim
          deste documento.
        </li>
      </ul>
    ),
  },
  {
    id: 'origem-dados',
    numero: '3',
    titulo: 'De onde vêm os dados do catálogo',
    conteudo: (
      <p>
        Os datasets publicados são fornecidos por instituições identificadas em cada ficha (por
        exemplo, ministérios, institutos nacionais de estatística, organizações de conservação, ou
        projectos de mapeamento aberto como o OpenStreetMap). O Data Portal actua como agregador e
        facilitador de acesso: organiza, cataloga e disponibiliza estes dados de forma pesquisável,
        mas não é a fonte primária da generalidade da informação neles contida. A exactidão de cada
        dataset continua a ser da responsabilidade da respectiva entidade fornecedora.
      </p>
    ),
  },
  {
    id: 'ia-eticamente',
    numero: '4',
    titulo: 'Uso ético da Inteligência Artificial',
    conteudo: (
      <ul>
        <li>O AI Insights responde apenas com base nos datasets seleccionados pelo utilizador, nunca inventando números fora dos dados fornecidos.</li>
        <li>Toda resposta cita o dataset, a fonte e o ano usados, gerados pelo servidor a partir de metadados reais, nunca pelo próprio modelo de IA.</li>
        <li>Estimativas de tendência ou projecção são sempre rotuladas como estimativa da IA, nunca como um modelo estatístico formalmente validado.</li>
        <li>O processamento por IA é feito de forma responsável e com limites de uso, para evitar sobrecarga do serviço e uso abusivo.</li>
      </ul>
    ),
  },
  {
    id: 'limites',
    numero: '5',
    titulo: 'O que este documento não cobre',
    conteudo: (
      <p>
        Este documento descreve princípios e práticas, não é uma certificação formal de terceiros
        nem substitui uma auditoria externa. Para o tratamento de dados pessoais dos utilizadores
        do portal (conta, autenticação, cookies), consulte a{' '}
        <a href="/politica-privacidade">Política de Privacidade</a> e a{' '}
        <a href="/politica-cookies">Política de Cookies</a>, que são os documentos juridicamente
        vinculativos sobre essa matéria.
      </p>
    ),
  },
  {
    id: 'alteracoes',
    numero: '6',
    titulo: 'Alterações a este documento',
    conteudo: (
      <p>
        Podemos actualizar esta abordagem à medida que o portal cresce ou que novas práticas forem
        adoptadas. A data de "última actualização" no topo identifica a versão em vigor.
      </p>
    ),
  },
]

export default function AbordagemEticaPage() {
  return (
    <LegalPageLayout
      eyebrow="Documento institucional · Ética de dados"
      titulo="Abordagem Ética de Recolha de Dados"
      resumo="Os princípios que orientam como o Data Portal recolhe, publica e trata dados: transparência de fonte, minimização, e respeito pelas condições de cada dataset."
      versao={VERSAO}
      actualizadoEm={ACTUALIZADO_EM}
      sections={sections}
      documentosRelacionados={[
        { href: '/politica-privacidade', label: 'Política de Privacidade' },
        { href: '/termos-condicoes', label: 'Termos e Condições' },
        { href: '/politica-cookies', label: 'Política de Cookies' },
      ]}
    />
  )
}
