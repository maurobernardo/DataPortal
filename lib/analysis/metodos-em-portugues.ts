/**
 * Como cada método do motor se diz a quem não é analista.
 *
 * O painel "Porquê confio nisto" existe para dar confiança, e mostrar ali `resumo_estatistico` ou
 * `getis_ord_gi_estrela` faz o contrário: quem lê não reconhece a palavra e fica com a sensação de
 * que a resposta veio de uma caixa fechada. O nome técnico continua guardado nos resultados para
 * auditoria; o que aparece no ecrã é a frase daqui.
 *
 * Cliente-only (sem imports de servidor): usado directamente por componentes React.
 */

const EM_PORTUGUES: Record<string, string> = {
  perfil_coluna: 'Leitura da coluna original: quantos registos tem, quantos estão preenchidos e que valores aparecem',
  detectar_outliers: 'Comparação de cada unidade com a maioria, para encontrar as que ficam claramente fora do padrão',
  resumo_estatistico: 'Contagem e resumo dos valores registados: total, média, valor típico, mínimo e máximo',
  concentracao: 'Medição de quanto o total se concentra em poucas unidades, em vez de estar repartido',
  curva_lorenz: 'Desenho de como o total se reparte entre as unidades, da que tem menos à que tem mais',
  comparar_grupos: 'Comparação entre dois grupos, verificando se a diferença é grande e consistente',
  comparar_periodos: 'Comparação entre dois momentos no tempo, em valor e em proporção',
  tendencia_mann_kendall: 'Verificação de se a série sobe ou desce de forma consistente ao longo dos anos',
  cagr: 'Cálculo do ritmo médio de crescimento por ano entre o primeiro e o último momento',
  media_movel: 'Suavização da série ao longo do tempo, para ver o rumo sem o vaivém de ano para ano',
  correlacao_pearson: 'Verificação de se as duas medidas sobem e descem juntas ao longo das unidades',
  correlacao_spearman: 'Verificação de se as duas medidas acompanham a mesma ordem, da mais alta à mais baixa',
  regressao_linear: 'Estimativa de quanto uma medida acompanha a outra, e com que margem de erro',
  detectar_simpson: 'Verificação de se o resultado geral se inverte quando se olha grupo a grupo',
  pesos_knn: 'Definição de quais unidades contam como vizinhas de cada uma, pelas mais próximas',
  pesos_distancia: 'Definição de quais unidades contam como vizinhas de cada uma, pela distância entre elas',
  moran_global: 'Verificação de se unidades vizinhas tendem a ter valores parecidos em todo o país',
  moran_local_lisa: 'Identificação de zonas onde unidades vizinhas partilham valores altos ou valores baixos',
  getis_ord_gi_estrela: 'Identificação de zonas de concentração alta e de concentração baixa no mapa',
  geary_c: 'Verificação de se as diferenças entre unidades vizinhas são maiores ou menores do que o esperado',
  juntar_datasets: 'Ligação dos conjuntos de dados pela unidade geográfica comum a ambos',
  distribuicao_categoria_geo: 'Contagem de cada categoria dentro de cada unidade geográfica',
  mapas_por_periodo: 'Leitura do mesmo indicador em vários momentos, para os comparar lado a lado',
  variacao_geografica: 'Comparação de cada unidade entre o primeiro e o último período, para ver quem subiu e quem desceu',
  listar_registos: 'Leitura dos nomes de cada registo, um a um, tal como estão no ficheiro',
  execucao_codigo: 'Cálculo feito sobre as tabelas originais, passo a passo, com o resultado verificado',
  distancia_minima: 'Medição da distância de cada ponto até ao ponto mais próximo do outro conjunto',
  contagem_buffer: 'Contagem de quantas ocorrências caem dentro de um raio à volta de cada ponto',
  teste_maup: 'Verificação de se a conclusão se mantém quando se muda o nível geográfico da análise',
  enriquecimento_externo: 'Preenchimento de valores em falta a partir de outra fonte do próprio portal',
}

/**
 * A frase para um método. Um método desconhecido devolve o nome legível em vez de `null`: é melhor
 * mostrar "resumo estatístico" do que deixar o painel com um campo vazio.
 */
export function metodoEmPortugues(metodo: string): string {
  if (!metodo) return 'Cálculo directo sobre os dados'
  return EM_PORTUGUES[metodo] || metodo.replace(/_/g, ' ')
}

/** "11 linhas do conjunto de dados" lê-se melhor do que um número solto debaixo de "linhas usadas". */
export function linhasEmPortugues(linhas: number): string {
  if (!Number.isFinite(linhas) || linhas <= 0) return 'Sem linhas contadas'
  const n = linhas.toLocaleString('pt-PT')
  return linhas === 1 ? '1 registo do conjunto de dados' : `${n} registos do conjunto de dados`
}
