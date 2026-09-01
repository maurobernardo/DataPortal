import { getCliente, modeloPara } from './router'

/**
 * Correcção de transcrição de voz (PLANO-INTELIGENCIA-PORTAL.md): o reconhecimento de voz do
 * navegador (Web Speech API, usado em NovaAnaliseClient.tsx) costuma sair sem pontuação, com
 * maiúsculas erradas e a confundir nomes próprios/termos técnicos foneticamente parecidos (ex.:
 * "Cabo del Gado" em vez de "Cabo Delgado"). Isto corrige só a forma — nunca acrescenta nem
 * reinterpreta o conteúdo da pergunta.
 */

const SISTEMA_CORRECAO =
  'Corriges o texto de uma transcrição de voz em português de Moçambique, sem alterar o que a ' +
  'pessoa quis perguntar. Corrige só: pontuação, maiúsculas, e palavras que a transcrição de voz ' +
  'claramente ouviu mal (nomes de províncias/distritos de Moçambique, termos estatísticos comuns). ' +
  'Nunca acrescentes informação nova, nunca respondas à pergunta, nunca expliques o que fizeste. ' +
  'Nunca uses o travessão "—": usa ":" ou ";". Responde só com o texto corrigido, sem aspas nem comentários.'

export async function corrigirTranscricaoVoz(textoBruto: string): Promise<{ texto: string }> {
  const texto = textoBruto.trim()
  if (!texto) return { texto: '' }

  const cliente = getCliente()
  const resposta = await cliente.messages.create({
    model: modeloPara('compreensao'),
    max_tokens: 400,
    system: SISTEMA_CORRECAO,
    messages: [{ role: 'user', content: texto }],
  } as any)

  const corrigido = (resposta as any).content
    ?.filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
    .trim() || ''

  return { texto: corrigido || texto }
}
