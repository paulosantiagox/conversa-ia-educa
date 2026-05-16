const ADMIN_KEY = import.meta.env.VITE_OPENAI_ADMIN_KEY

export async function fetchOpenAIUsage(dias = 30) {
  if (!ADMIN_KEY) return null

  const agora = Math.floor(Date.now() / 1000)
  const inicio = agora - dias * 24 * 60 * 60

  try {
    const res = await fetch(
      `https://api.openai.com/v1/organization/costs?start_time=${inicio}&end_time=${agora}&limit=180`,
      { headers: { Authorization: `Bearer ${ADMIN_KEY}` } }
    )

    if (res.status === 401 || res.status === 403) {
      return { erro: 'sem_permissao' }
    }

    if (!res.ok) {
      return { erro: `erro_api_${res.status}` }
    }

    const json = await res.json()
    const periodos = json?.data ?? []

    let total_usd = 0
    const por_dia = []

    for (const periodo of periodos) {
      const dia = new Date(periodo.start_time * 1000).toISOString().slice(0, 10)
      const valor = (periodo.results ?? []).reduce((s, r) => s + (r?.amount?.value ?? 0), 0)
      total_usd += valor
      por_dia.push({ dia, valor_usd: valor })
    }

    return { total_usd, por_dia }
  } catch {
    return null
  }
}
