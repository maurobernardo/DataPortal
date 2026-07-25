export async function parseApiResponse<T = Record<string, unknown>>(
  response: Response
): Promise<{ data: T; ok: boolean; status: number }> {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const data = (await response.json()) as T
    return { data, ok: response.ok, status: response.status }
  }

  const text = await response.text()
  const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 120)

  throw new Error(
    response.status === 404
      ? 'Serviço indisponível. Recarregue a página ou reinicie o servidor de desenvolvimento.'
      : snippet.startsWith('<!DOCTYPE') || snippet.startsWith('<html')
        ? 'Resposta inválida do servidor. Verifique se está a usar a porta correcta (http://localhost:3000).'
        : snippet || `Erro HTTP ${response.status}`
  )
}
