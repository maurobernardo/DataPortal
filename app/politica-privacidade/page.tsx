import type { Metadata } from 'next'
import { LegalPageLayout, type LegalSection } from '@/components/legal/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Política de Privacidade · Data Portal',
  description:
    'Como o Data Portal (Data4Moz) recolhe, usa, protege e permite controlar os dados pessoais dos seus utilizadores.',
}

const ACTUALIZADO_EM = '23 de Agosto de 2026'
const VERSAO = '2.0'

const sections: LegalSection[] = [
  {
    id: 'quem-somos',
    numero: '1',
    titulo: 'Quem somos e âmbito deste documento',
    conteudo: (
      <>
        <p>
          O Data Portal é operado pela <strong>Data4Moz</strong>, entidade responsável pelo
          tratamento dos dados pessoais recolhidos através da plataforma (o "responsável pelo
          tratamento"). Este documento explica que dados pessoais recolhemos, para que fins os
          usamos, com quem os partilhamos, durante quanto tempo os conservamos e como pode exercer
          os seus direitos sobre eles.
        </p>
        <p>
          Aplica-se a qualquer pessoa que visite o portal, crie uma conta, faça download de
          datasets, use o AI Insights ou contacte a Data4Moz através dos canais do portal.
        </p>
        <div className="legal-doc-callout">
          Este documento deve ser lido em conjunto com os{' '}
          <a href="/termos-condicoes">Termos e Condições</a> e a{' '}
          <a href="/politica-cookies">Política de Cookies</a>, que tratam, respectivamente, das
          regras de uso da plataforma e do uso de cookies e tecnologias semelhantes.
        </div>
      </>
    ),
  },
  {
    id: 'dados-recolhidos',
    numero: '2',
    titulo: 'Que dados pessoais recolhemos',
    conteudo: (
      <>
        <p>Recolhemos apenas os dados necessários para o funcionamento do portal e dos seus serviços:</p>
        <div className="legal-doc-table-wrap">
          <table className="legal-doc-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Dados</th>
                <th>Quando</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Conta de utilizador</td>
                <td>Nome, email, palavra-passe (guardada de forma cifrada, nunca em texto simples)</td>
                <td>No registo</td>
              </tr>
              <tr>
                <td>Verificação e segurança da conta</td>
                <td>Código de verificação de email, código de autenticação de dois factores (2FA), quando activados</td>
                <td>No registo e em cada início de sessão que o exija</td>
              </tr>
              <tr>
                <td>Início de sessão social (opcional)</td>
                <td>Nome, email e identificador de conta fornecidos pela Google ou LinkedIn, quando escolhe entrar por essa via</td>
                <td>Ao usar "Continuar com Google" ou "Continuar com LinkedIn"</td>
              </tr>
              <tr>
                <td>Utilização do AI Insights</td>
                <td>As perguntas que escreve, os datasets seleccionados e as análises geradas e guardadas na sua conta</td>
                <td>Ao usar a análise por IA</td>
              </tr>
              <tr>
                <td>Origem geográfica aproximada</td>
                <td>País, região e cidade aproximados, derivados do endereço IP no momento do acesso; o endereço IP em si não é guardado nos registos de origem</td>
                <td>Em vistas de datasets, downloads, pedidos e análises de IA</td>
              </tr>
              <tr>
                <td>Comunicações</td>
                <td>Nome, email, assunto e mensagem enviados através do formulário de contacto ou de pedidos de dados/relatórios</td>
                <td>Quando nos contacta</td>
              </tr>
              <tr>
                <td>Preferências locais</td>
                <td>Idioma escolhido e estado de consentimento aos Termos, guardados no seu próprio dispositivo (não no nosso servidor)</td>
                <td>Ao escolher idioma ou responder ao aviso de termos</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Não pedimos nem tratamos intencionalmente categorias especiais de dados (origem racial ou
          étnica, opiniões políticas, convicções religiosas, dados de saúde, orientação sexual, entre
          outras). Os datasets públicos disponibilizados no catálogo são dados estatísticos e
          geoespaciais agregados, fornecidos pelas instituições de origem indicadas em cada dataset,
          e não constituem dados pessoais dos utilizadores do portal.
        </p>
      </>
    ),
  },
  {
    id: 'finalidades',
    numero: '3',
    titulo: 'Para que finalidades usamos os seus dados',
    conteudo: (
      <ul>
        <li><strong>Criar e gerir a sua conta</strong>: autenticação, recuperação de palavra-passe, verificação de email e autenticação de dois factores.</li>
        <li><strong>Prestar o serviço de AI Insights</strong>: processar a sua pergunta contra os datasets seleccionados e devolver o resultado, e permitir-lhe guardar, rever e partilhar as suas próprias análises.</li>
        <li><strong>Segurança e prevenção de abuso</strong>: aplicar limites de utilização (por exemplo, o número de análises de IA por hora), detectar acessos indevidos e manter um registo de acções administrativas.</li>
        <li><strong>Responder a pedidos e mensagens</strong>: contacto directo, pedidos de dados personalizados, pedidos de mapas ou relatórios.</li>
        <li><strong>Melhorar o portal</strong>: perceber que tipo de perguntas e datasets têm mais procura, de forma agregada, para priorizar novos dados e funcionalidades.</li>
        <li><strong>Cumprir obrigações legais</strong>, quando aplicável, perante as autoridades moçambicanas competentes.</li>
      </ul>
    ),
  },
  {
    id: 'base-legal',
    numero: '4',
    titulo: 'Base legal do tratamento',
    conteudo: (
      <>
        <p>Tratamos os seus dados pessoais com base em, consoante o caso:</p>
        <ul>
          <li><strong>Execução de um contrato consigo</strong>: para lhe fornecer a conta e as funcionalidades que pediu ao registar-se e ao usar o portal.</li>
          <li><strong>Consentimento</strong>: para o início de sessão por Google/LinkedIn e para preferências não essenciais, que pode retirar a qualquer momento.</li>
          <li><strong>Interesse legítimo</strong>: para segurança da plataforma, prevenção de abuso e melhoria do serviço, sempre ponderado com os seus direitos e expectativas razoáveis de privacidade.</li>
          <li><strong>Cumprimento de obrigação legal</strong>, quando exigido pela legislação moçambicana aplicável.</li>
        </ul>
        <div className="legal-doc-callout">
          O tratamento de dados pessoais no Data Portal é regido pela legislação moçambicana em
          vigor em matéria de protecção de dados pessoais. As referências legais específicas deste
          documento serão confirmadas e actualizadas com apoio de assessoria jurídica dedicada,
          nomeadamente no contexto do processo de avaliação junto do INTIC.
        </div>
      </>
    ),
  },
  {
    id: 'partilha-terceiros',
    numero: '5',
    titulo: 'Partilha de dados com terceiros',
    conteudo: (
      <>
        <p>Não vendemos dados pessoais a terceiros. Partilhamos dados apenas nas seguintes situações:</p>
        <ul>
          <li>
            <strong>Processamento das análises de IA</strong>: a pergunta que escreve e o conteúdo
            dos datasets seleccionados são enviados, no momento da análise, ao fornecedor do modelo
            de inteligência artificial (Anthropic) para gerar a resposta. Este envio é feito
            directamente pelo nosso servidor, nunca a partir do seu navegador, e a chave de acesso a
            esse serviço nunca é exposta publicamente.
          </li>
          <li>
            <strong>Início de sessão social</strong>: se optar por entrar com Google ou LinkedIn,
            essas plataformas partilham connosco os dados de perfil básico que autorizar no momento
            do início de sessão.
          </li>
          <li>
            <strong>Prestadores de infraestrutura</strong>: alojamento, base de dados e envio de
            emails transaccionais (por exemplo, verificação de conta ou recuperação de palavra-passe),
            estritamente para operar o portal.
          </li>
          <li>
            <strong>Autoridades competentes</strong>, quando exigido por lei ou por ordem judicial
            válida.
          </li>
        </ul>
        <p>
          Qualquer terceiro com quem partilhemos dados está contratualmente obrigado a tratá-los
          apenas para os fins acordados e com medidas de segurança adequadas.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    numero: '6',
    titulo: 'Cookies e tecnologias semelhantes',
    conteudo: (
      <p>
        Usamos um número reduzido de cookies, essencialmente para manter a sua sessão iniciada, e
        algumas preferências guardadas localmente no seu dispositivo (idioma, consentimento aos
        termos). Os detalhes completos, incluindo como os pode gerir ou recusar, estão descritos na{' '}
        <a href="/politica-cookies">Política de Cookies</a>.
      </p>
    ),
  },
  {
    id: 'conservacao',
    numero: '7',
    titulo: 'Conservação e eliminação dos dados',
    conteudo: (
      <>
        <p>
          Conservamos os dados da sua conta enquanto esta estiver activa. Pode eliminar a sua conta
          a qualquer momento a partir da sua área de <a href="/perfil">Perfil</a>, na secção "Zona
          de perigo": a eliminação remove definitivamente a sua conta e as análises de IA guardadas,
          e anonimiza os registos de utilização associados (deixam de ficar associados à sua
          identidade, mas podem manter-se de forma agregada e não identificável para efeitos
          estatísticos).
        </p>
        <p>
          Mensagens de contacto e registos de acesso com fins de segurança podem ser conservados por
          um período adicional limitado, estritamente necessário para efeitos de auditoria,
          prevenção de abuso ou cumprimento de obrigações legais.
        </p>
      </>
    ),
  },
  {
    id: 'seguranca',
    numero: '8',
    titulo: 'Segurança da informação',
    conteudo: (
      <ul>
        <li>As palavras-passe são guardadas de forma cifrada (hash), nunca em texto simples.</li>
        <li>O acesso administrativo é limitado por função (perfil de administrador) e fica registado num registo de auditoria interno, com identificação de quem fez o quê e quando.</li>
        <li>O acesso a serviços de inteligência artificial é feito exclusivamente pelo servidor; chaves de acesso a serviços externos nunca são expostas ao navegador do utilizador.</li>
        <li>É aplicado um limite de utilização às análises de IA por utilizador e por hora, para prevenir uso abusivo e proteger a disponibilidade do serviço para todos.</li>
        <li>Contas podem ser temporariamente desactivadas em caso de suspeita fundamentada de abuso, sem apagar os dados associados, até esclarecimento.</li>
      </ul>
    ),
  },
  {
    id: 'direitos',
    numero: '9',
    titulo: 'Os seus direitos e como exercê-los',
    conteudo: (
      <>
        <p>Sobre os seus dados pessoais, tem o direito de:</p>
        <ul>
          <li><strong>Aceder</strong> aos dados que temos sobre si.</li>
          <li><strong>Rectificar</strong> dados incorrectos ou desactualizados (nome, email, palavra-passe) directamente no seu Perfil.</li>
          <li><strong>Exportar</strong> uma cópia dos seus dados e análises guardadas, em formato estruturado.</li>
          <li><strong>Eliminar</strong> a sua conta e os dados pessoais associados.</li>
          <li><strong>Retirar o consentimento</strong> dado anteriormente, quando o tratamento se basear em consentimento (por exemplo, início de sessão social), sem afectar a legalidade do tratamento já realizado.</li>
          <li><strong>Opor-se</strong> a um tratamento específico ou pedir esclarecimentos adicionais, contactando-nos directamente.</li>
        </ul>
        <div className="legal-doc-callout">
          Pode exercer os direitos de acesso, exportação e eliminação directamente, sem depender de
          um pedido manual: aceda a <a href="/perfil">Perfil → Exportar os meus dados</a> ou{' '}
          <a href="/perfil">Perfil → Eliminar conta</a>. Para qualquer outro pedido, use os
          contactos no final deste documento.
        </div>
      </>
    ),
  },
  {
    id: 'menores',
    numero: '10',
    titulo: 'Menores de idade',
    conteudo: (
      <p>
        O Data Portal não se destina a ser usado, sem supervisão de um encarregado de educação, por
        menores de 18 anos. Não recolhemos intencionalmente dados de crianças. Se tiver conhecimento
        de que um menor criou uma conta sem supervisão adequada, contacte-nos para procedermos à sua
        remoção.
      </p>
    ),
  },
  {
    id: 'transferencias',
    numero: '11',
    titulo: 'Transferências internacionais de dados',
    conteudo: (
      <p>
        Alguns dos prestadores de serviço que usamos para operar o portal, nomeadamente o
        fornecedor do modelo de inteligência artificial usado no AI Insights, processam dados fora
        de Moçambique. Nestes casos, exigimos que o prestador aplique medidas de segurança e
        confidencialidade adequadas, e apenas partilhamos o mínimo de dados necessário para prestar
        o serviço pedido (a pergunta feita e o conteúdo dos datasets seleccionados, nunca a sua
        palavra-passe ou dados de pagamento, que o portal, de resto, não recolhe).
      </p>
    ),
  },
  {
    id: 'alteracoes',
    numero: '12',
    titulo: 'Alterações a esta política',
    conteudo: (
      <p>
        Podemos actualizar esta Política de Privacidade para reflectir alterações ao portal ou à
        legislação aplicável. A data de "última actualização" no topo deste documento identifica a
        versão em vigor. Alterações materiais serão assinaladas de forma visível no portal.
      </p>
    ),
  },
]

export default function PoliticaPrivacidadePage() {
  return (
    <LegalPageLayout
      eyebrow="Documento legal · Protecção de dados pessoais"
      titulo="Política de Privacidade"
      resumo="Como o Data Portal recolhe, usa, protege e permite controlar os seus dados pessoais, e quais os seus direitos sobre eles."
      versao={VERSAO}
      actualizadoEm={ACTUALIZADO_EM}
      sections={sections}
      documentosRelacionados={[
        { href: '/termos-condicoes', label: 'Termos e Condições' },
        { href: '/politica-cookies', label: 'Política de Cookies' },
        { href: '/abordagem-etica', label: 'Abordagem Ética de Recolha de Dados' },
      ]}
    />
  )
}
