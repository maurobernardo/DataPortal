/**
 * Opções do menu "Qual a sua área?" no registo. Os valores coincidem com
 * `perfil_utilizador_inferido` do motor de análise (lib/analysis/types.ts) onde já existe uma
 * taxonomia equivalente — reaproveitá-la evita duas listas divergentes para a mesma ideia.
 */
export const OPCOES_AREA_UTILIZADOR = [
  { value: 'estudante', label: 'Estudante' },
  { value: 'investigador', label: 'Investigador / Académico' },
  { value: 'jornalista', label: 'Jornalista' },
  { value: 'gestor_publico', label: 'Funcionário público / Gestor do Estado' },
  { value: 'ong', label: 'ONG / Sociedade civil' },
  { value: 'privado', label: 'Sector privado / Empresa' },
  { value: 'outro', label: 'Outro' },
] as const

export type AreaUtilizador = (typeof OPCOES_AREA_UTILIZADOR)[number]['value']

export const VALORES_AREA_UTILIZADOR: readonly string[] = OPCOES_AREA_UTILIZADOR.map((o) => o.value)

/** Opções do menu "Para que fim pretende utilizar os dados?" no formulário de contacto. */
export const OPCOES_FINALIDADE_CONTACTO = [
  { value: 'investigacao', label: 'Investigação académica' },
  { value: 'jornalismo', label: 'Jornalismo' },
  { value: 'gestao_publica', label: 'Gestão pública / Governo' },
  { value: 'estudos', label: 'Estudos (trabalho de curso, tese)' },
  { value: 'ong', label: 'ONG / Projecto social' },
  { value: 'privado', label: 'Negócio / Sector privado' },
  { value: 'pessoal', label: 'Uso pessoal' },
  { value: 'outro', label: 'Outro' },
] as const

export type FinalidadeContacto = (typeof OPCOES_FINALIDADE_CONTACTO)[number]['value']

export const VALORES_FINALIDADE_CONTACTO: readonly string[] = OPCOES_FINALIDADE_CONTACTO.map((o) => o.value)
