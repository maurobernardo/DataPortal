import type { Metadata } from 'next'
import { LegalPageLayout, type LegalSection } from '@/components/legal/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Política de Cookies · Data Portal',
  description: 'Que cookies e tecnologias semelhantes o Data Portal usa, para quê, e como as pode gerir.',
}

const ACTUALIZADO_EM = '23 de Agosto de 2026'
const VERSAO = '2.0'

const sections: LegalSection[] = [
  {
    id: 'o-que-sao',
    numero: '1',
    titulo: 'O que são cookies e tecnologias semelhantes',
    conteudo: (
      <p>
        Cookies são pequenos ficheiros guardados no seu navegador quando visita um site, usados
        para manter informação entre pedidos (por exemplo, manter a sua sessão iniciada). Também
        usamos o armazenamento local do navegador ("local storage") para guardar preferências que
        não precisam de ser enviadas ao servidor a cada pedido, como o idioma escolhido. Este
        documento cobre ambos, por serem tecnologias com o mesmo propósito prático para si enquanto
        utilizador.
      </p>
    ),
  },
  {
    id: 'essenciais',
    numero: '2',
    titulo: 'Cookies essenciais',
    conteudo: (
      <>
        <p>
          Estes cookies são estritamente necessários para o portal funcionar e não podem ser
          desactivados através das nossas configurações, porque o portal deixa de funcionar
          correctamente sem eles.
        </p>
        <div className="legal-doc-table-wrap">
          <table className="legal-doc-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Finalidade</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>session</code></td>
                <td>Mantém a sua sessão iniciada depois do login, para não ter de voltar a autenticar-se em cada página.</td>
                <td>Até terminar a sessão ou expirar por inactividade</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: 'armazenamento-local',
    numero: '3',
    titulo: 'Preferências guardadas no seu dispositivo',
    conteudo: (
      <>
        <p>
          Além do cookie de sessão, guardamos alguns valores directamente no seu navegador (local
          storage), que nunca são enviados para o nosso servidor:
        </p>
        <div className="legal-doc-table-wrap">
          <table className="legal-doc-table">
            <thead>
              <tr>
                <th>Chave</th>
                <th>Finalidade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>dataPortalTermsConsent</code></td>
                <td>Regista se já aceitou, rejeitou ou pediu para rever mais tarde o aviso de Termos e Condições, para não voltar a mostrar o aviso desnecessariamente.</td>
              </tr>
              <tr>
                <td><code>dataPortalTermsRemindAt</code></td>
                <td>Se escolher "Lembrar depois", guarda por quanto tempo o aviso deve ficar oculto antes de voltar a aparecer.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: 'terceiros',
    numero: '4',
    titulo: 'Cookies de serviços de terceiros',
    conteudo: (
      <>
        <p>Alguns cookies são definidos por serviços de terceiros que optar por usar, não por nós directamente:</p>
        <ul>
          <li><strong>Google e LinkedIn</strong>: se optar por iniciar sessão através destas plataformas, elas próprias podem definir cookies próprios durante o processo de autenticação, regidos pelas respectivas políticas de privacidade.</li>
          <li><strong>Tradutor do navegador</strong>: se usar uma ferramenta de tradução automática do seu navegador para traduzir o portal, essa ferramenta pode carregar recursos próprios, fora do nosso controlo.</li>
        </ul>
        <p>Não usamos cookies de publicidade nem cookies de análise de terceiros com fins de perfilagem publicitária.</p>
      </>
    ),
  },
  {
    id: 'gestao',
    numero: '5',
    titulo: 'Como gerir cookies',
    conteudo: (
      <>
        <p>
          Pode gerir ou apagar cookies e dados de sites nas definições do seu navegador a qualquer
          momento. Tenha em conta que bloquear o cookie <code>session</code> impede-o de permanecer
          autenticado no portal, e algumas funcionalidades (como o AI Insights ou guardar análises)
          deixam de estar disponíveis sem sessão iniciada.
        </p>
        <p>
          Pode também limpar as preferências locais mencionadas no ponto 3 apagando os dados de
          navegação/armazenamento local do site nas definições do seu navegador.
        </p>
      </>
    ),
  },
  {
    id: 'alteracoes',
    numero: '6',
    titulo: 'Alterações a esta política',
    conteudo: (
      <p>
        Se passarmos a usar novos cookies ou tecnologias semelhantes, actualizaremos este documento
        e a data de "última actualização" no topo. Alterações materiais serão assinaladas de forma
        visível no portal.
      </p>
    ),
  },
]

export default function PoliticaCookiesPage() {
  return (
    <LegalPageLayout
      eyebrow="Documento legal · Cookies e armazenamento local"
      titulo="Política de Cookies"
      resumo="Que cookies e tecnologias semelhantes o Data Portal usa, para quê, e como as pode gerir no seu navegador."
      versao={VERSAO}
      actualizadoEm={ACTUALIZADO_EM}
      sections={sections}
      documentosRelacionados={[
        { href: '/politica-privacidade', label: 'Política de Privacidade' },
        { href: '/termos-condicoes', label: 'Termos e Condições' },
        { href: '/abordagem-etica', label: 'Abordagem Ética de Recolha de Dados' },
      ]}
    />
  )
}
