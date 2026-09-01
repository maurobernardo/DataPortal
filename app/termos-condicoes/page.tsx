import type { Metadata } from 'next'
import { LegalPageLayout, type LegalSection } from '@/components/legal/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Termos e Condições · Data Portal',
  description: 'Regras de uso do Data Portal: contas, uso aceitável, dados do catálogo, AI Insights e responsabilidades.',
}

const ACTUALIZADO_EM = '23 de Agosto de 2026'
const VERSAO = '2.0'

const sections: LegalSection[] = [
  {
    id: 'aceitacao',
    numero: '1',
    titulo: 'Aceitação dos termos',
    conteudo: (
      <p>
        Estes Termos e Condições regulam o acesso e uso do Data Portal, operado pela{' '}
        <strong>Data4Moz</strong>. Ao aceder ao portal, criar uma conta ou usar qualquer
        funcionalidade (incluindo download de datasets, mapas, relatórios ou o AI Insights),
        confirma que leu, compreendeu e aceita estes termos. Se não concordar, deve deixar de usar
        o portal.
      </p>
    ),
  },
  {
    id: 'definicoes',
    numero: '2',
    titulo: 'Definições',
    conteudo: (
      <ul>
        <li><strong>"Portal"</strong>: o Data Portal, incluindo todas as suas páginas, catálogo de dados, mapas, relatórios e o AI Insights.</li>
        <li><strong>"Dataset"</strong>: um conjunto de dados geoespaciais ou alfanuméricos publicado no catálogo, com indicação da fonte, ano e formato.</li>
        <li><strong>"Utilizador"</strong>: qualquer pessoa que acede ao portal, com ou sem conta registada.</li>
        <li><strong>"AI Insights"</strong>: a funcionalidade de análise de dados por inteligência artificial, activada a pedido do utilizador.</li>
        <li><strong>"Conteúdo do utilizador"</strong>: perguntas, mensagens e outras informações submetidas pelo utilizador ao portal.</li>
      </ul>
    ),
  },
  {
    id: 'conta',
    numero: '3',
    titulo: 'Elegibilidade e conta de utilizador',
    conteudo: (
      <>
        <p>
          Para usar funcionalidades que exigem sessão iniciada (como o AI Insights ou guardar
          análises), precisa de criar uma conta com um email válido, ou entrar através de uma conta
          Google ou LinkedIn. É responsável por:
        </p>
        <ul>
          <li>Fornecer informação verdadeira e mantê-la actualizada;</li>
          <li>Manter a confidencialidade da sua palavra-passe e de qualquer código de verificação de dois factores;</li>
          <li>Notificar-nos imediatamente em caso de suspeita de uso não autorizado da sua conta.</li>
        </ul>
        <p>
          Reservamo-nos o direito de suspender ou desactivar contas que violem estes termos, sem
          prejuízo dos dados poderem ser recuperados ou eliminados nos termos da{' '}
          <a href="/politica-privacidade">Política de Privacidade</a>.
        </p>
      </>
    ),
  },
  {
    id: 'uso-aceitavel',
    numero: '4',
    titulo: 'Uso aceitável',
    conteudo: (
      <>
        <p>Ao usar o portal, compromete-se a não:</p>
        <ul>
          <li>Tentar aceder sem autorização a áreas, contas ou dados que não lhe pertencem;</li>
          <li>Automatizar pedidos ao portal ou ao AI Insights de forma a contornar os limites de utilização definidos, ou de forma que sobrecarregue a plataforma;</li>
          <li>Submeter conteúdo malicioso, ilegal, difamatório ou que viole direitos de terceiros;</li>
          <li>Utilizar os dados do catálogo, os mapas ou os resultados do AI Insights para fins ilegais ou para induzir terceiros em erro sobre a sua origem;</li>
          <li>Tentar extrair, de forma automatizada e em larga escala, o conteúdo integral do catálogo fora dos mecanismos de exportação disponibilizados para esse fim.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'dados-catalogo',
    numero: '5',
    titulo: 'Dados do catálogo: origem, precisão e licenciamento',
    conteudo: (
      <>
        <p>
          Os datasets disponibilizados no portal são fornecidos pelas instituições de origem
          identificadas em cada ficha de dataset (fonte, ano e formato). O Data Portal actua como
          agregador e facilitador de acesso a estes dados, mas <strong>não é o autor original</strong>{' '}
          da generalidade da informação neles contida.
        </p>
        <ul>
          <li>A exactidão, actualidade e completude de cada dataset é da responsabilidade da respectiva entidade fornecedora.</li>
          <li>O uso de qualquer dataset para decisões técnicas, financeiras ou operacionais deve ser precedido de validação adequada ao contexto de uso pretendido.</li>
          <li>O uso de cada dataset está sujeito à licença e condições indicadas na sua própria ficha, quando aplicável.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ai-insights',
    numero: '6',
    titulo: 'AI Insights: natureza e limites',
    conteudo: (
      <>
        <p>
          O AI Insights gera respostas, gráficos, mapas e estimativas a partir dos datasets que
          seleccionar, usando um modelo de inteligência artificial. Ao usar esta funcionalidade,
          reconhece e aceita que:
        </p>
        <ul>
          <li>As respostas são geradas automaticamente e podem, em casos raros, conter imprecisões, apesar de serem sempre fundamentadas nos dados fornecidos e de citarem a fonte e o ano usados;</li>
          <li>Estimativas de tendência ou projecção são identificadas como estimativas da IA, nunca como certezas ou como um modelo estatístico formalmente validado, e não substituem análise técnica especializada para decisões de risco elevado;</li>
          <li>O uso do AI Insights está sujeito a um limite de análises por hora, por conta, para garantir a disponibilidade do serviço a todos os utilizadores;</li>
          <li>O conteúdo das perguntas e dos datasets seleccionados é processado, no momento da análise, por um fornecedor externo de inteligência artificial, nos termos descritos na <a href="/politica-privacidade">Política de Privacidade</a>.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'propriedade-intelectual',
    numero: '7',
    titulo: 'Propriedade intelectual',
    conteudo: (
      <p>
        A marca, o design, o código e os textos originais do Data Portal são propriedade da
        Data4Moz ou das partes que os licenciaram para uso na plataforma, e não podem ser
        reproduzidos ou usados sem autorização fora do uso normal do portal. Os datasets mantêm a
        titularidade e licenciamento das respectivas entidades de origem, conforme indicado no
        ponto 5.
      </p>
    ),
  },
  {
    id: 'disponibilidade',
    numero: '8',
    titulo: 'Disponibilidade do serviço',
    conteudo: (
      <p>
        Envidamos esforços razoáveis para manter o portal disponível e actualizado, mas não
        garantimos disponibilidade ininterrupta, isenção de erros, ou que o portal estará sempre
        livre de interrupções para manutenção, actualização de funcionalidades ou motivos fora do
        nosso controlo directo (por exemplo, indisponibilidade de fornecedores externos de
        infraestrutura ou de inteligência artificial).
      </p>
    ),
  },
  {
    id: 'responsabilidade',
    numero: '9',
    titulo: 'Limitação de responsabilidade',
    conteudo: (
      <p>
        Na máxima medida permitida pela lei aplicável, a Data4Moz não se responsabiliza por danos
        indirectos decorrentes do uso do portal, de decisões tomadas com base nos dados ou
        estimativas do AI Insights sem a devida validação, ou de indisponibilidade temporária do
        serviço. Nada nestes termos limita responsabilidades que não possam ser legalmente
        excluídas ou limitadas.
      </p>
    ),
  },
  {
    id: 'suspensao',
    numero: '10',
    titulo: 'Suspensão e encerramento de conta',
    conteudo: (
      <p>
        Podemos suspender ou encerrar o acesso de um utilizador que viole estes termos, sem aviso
        prévio quando a gravidade da situação o justifique, mantendo os dados associados nos termos
        da <a href="/politica-privacidade">Política de Privacidade</a> até à sua eliminação a
        pedido do utilizador ou nos prazos aí previstos. Pode encerrar a sua própria conta a
        qualquer momento em <a href="/perfil">Perfil → Eliminar conta</a>.
      </p>
    ),
  },
  {
    id: 'alteracoes',
    numero: '11',
    titulo: 'Alterações a estes termos',
    conteudo: (
      <p>
        Podemos actualizar estes Termos e Condições para reflectir novas funcionalidades, requisitos
        legais ou melhorias de segurança. A data de "última actualização" no topo deste documento
        identifica a versão em vigor. O uso continuado do portal após uma alteração implica a
        aceitação da versão actualizada.
      </p>
    ),
  },
  {
    id: 'lei-aplicavel',
    numero: '12',
    titulo: 'Lei aplicável',
    conteudo: (
      <p>
        Estes termos são regidos pela legislação da República de Moçambique. Qualquer litígio
        emergente do uso do portal será, na medida do possível, resolvido por via extrajudicial
        através dos contactos indicados abaixo, antes de recurso a outras vias.
      </p>
    ),
  },
]

export default function TermosCondicoesPage() {
  return (
    <LegalPageLayout
      eyebrow="Documento legal · Regras de uso"
      titulo="Termos e Condições"
      resumo="Regras de uso do Data Portal: contas, uso aceitável, origem e licenciamento dos dados do catálogo, e os limites do AI Insights."
      versao={VERSAO}
      actualizadoEm={ACTUALIZADO_EM}
      sections={sections}
      documentosRelacionados={[
        { href: '/politica-privacidade', label: 'Política de Privacidade' },
        { href: '/politica-cookies', label: 'Política de Cookies' },
        { href: '/abordagem-etica', label: 'Abordagem Ética de Recolha de Dados' },
      ]}
    />
  )
}
