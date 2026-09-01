/**
 * Bateria sobre a revisao do titulo antes de publicar.
 *
 * O portao corre ANTES da execucao e nao sabe o que os calculos conseguiram. Quando o passo central
 * falha a meio, a analise publicava um painel sobre o proprio fracasso: visto ao vivo, "O calculo
 * directo de produtividade por provincia falhou". Publicar isso ocupa o ecra inteiro para dizer que
 * nao ha resposta, sem oferecer saida nenhuma.
 *
 * O que NAO pode acontecer e travar titulos que apenas contem uma ressalva honesta: "X lidera, mas
 * a relacao e fraca" e uma resposta legitima e tem de passar.
 *
 * Uso: npx tsx scripts/testar-revisao-titulo.ts
 */
const RE_DESISTE = (t: string) =>
  /^(n[ãa]o (foi|é|e) poss[ií]vel|n[ãa]o (h[áa]|se pode|d[áa]|permitem?)|sem dados|imposs[ií]vel|o c[áa]lculo .{0,40}falh|falh(ou|aram))/i.test(t.trim()) ||
  /\bfalh(ou|aram)\b/i.test(t.split(':')[0])

type Caso = { titulo: string; esperado: boolean }
const CASOS: Caso[] = [
  // Titulos que DESISTEM: tem de bloquear
  { titulo: 'O cálculo directo de produtividade por província falhou: os dados actuais não permitem apontar quem cultiva muito', esperado: true },
  { titulo: 'Não foi possível apurar qual província tem mais casos por tonelada', esperado: true },
  { titulo: 'Não é possível responder: o turismo só tem números nacionais', esperado: true },
  { titulo: 'Não dá para comparar turismo e tuberculose por província', esperado: true },
  { titulo: 'Impossível calcular a produtividade com os dados actuais', esperado: true },
  { titulo: 'Os testes falharam e não há resultado por província', esperado: true },
  // Titulos legitimos com ressalva: NAO podem bloquear
  { titulo: 'Nampula lidera em cana-de-açúcar, mas não lidera na eletrificação', esperado: false },
  { titulo: 'Manica é a maior produtora de milho, mas a produção nacional não mostra rumo claro', esperado: false },
  { titulo: 'Testar mais não significa ter menos HIV: Gaza lidera a prevalência', esperado: false },
  { titulo: 'Chifunde lidera em tabaco, mas quem manda em população é a Matola', esperado: false },
  { titulo: 'Sisal só existe em 3 dos 162 distritos: não há base para dizer que acompanha a população', esperado: false },
  { titulo: 'A pobreza explica o acesso à eletricidade melhor do que a população', esperado: false },
]

let falhas = 0
for (const c of CASOS) {
  const r = RE_DESISTE(c.titulo)
  const ok = r === c.esperado
  if (!ok) falhas++
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${r ? 'BLOQUEIA' : 'publica '} | ${c.titulo.slice(0, 72)}`)
}
console.log(`\n${CASOS.length - falhas}/${CASOS.length} casos correctos`)
if (falhas > 0) process.exit(1)
