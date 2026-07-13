import { supabase } from './supabase'
import { fetchConversations, isEJA } from './datacrazy'

// Páginas amostradas para verificação de cobertura
// Distribui em 4 pontos: início, 1/3, 2/3, fim
const TAKE = 50

async function verificarPagina(pagina) {
  const skip = (pagina - 1) * TAKE
  const resultado = await fetchConversations(skip, TAKE)

  const items = Array.isArray(resultado) ? resultado
    : Array.isArray(resultado?.data) ? resultado.data
    : Array.isArray(resultado?.conversations) ? resultado.conversations
    : []

  // Página além do fim real da API
  if (items.length === 0) return { pagina, skip, itemsTotal: 0, ejasTotal: 0, sincronizadas: 0, faltando: [], fimApi: true }

  const eja = items.filter(isEJA)

  // Página existe mas só tem Autoflix — válido
  if (eja.length === 0) return { pagina, skip, itemsTotal: items.length, ejasTotal: 0, sincronizadas: 0, faltando: [], fimApi: false }

  const ids = eja.map(c => String(c.id))

  const { data } = await supabase
    .from('ci_conversas')
    .select('datacrazy_id')
    .in('datacrazy_id', ids)

  const encontrados = new Set((data ?? []).map(r => r.datacrazy_id))
  const faltando = ids.filter(id => !encontrados.has(id))

  return {
    pagina,
    skip,
    itemsTotal: items.length,
    ejasTotal: eja.length,
    sincronizadas: encontrados.size,
    faltando,
    fimApi: false,
  }
}

export async function verificarCobertura(onLog = () => {}) {
  onLog('ℹ Iniciando verificação de cobertura por amostragem...')

  // Páginas fixas de amostragem: início, terço, dois terços, fim estimado
  // A API DataCrazy não retorna total — usamos pontos representativos conhecidos
  const paginas = [1, 50, 100, 150]

  const resultados = []
  let totalFaltando = 0
  let paginasComDados = 0

  for (const pagina of paginas) {
    onLog(`ℹ Verificando página ${pagina} (skip=${(pagina - 1) * TAKE})...`)
    try {
      const res = await verificarPagina(pagina)

      if (res.fimApi) {
        onLog(`ℹ Página ${pagina}: além do fim da API — ignorada`)
        continue
      }

      if (res.ejasTotal === 0) {
        onLog(`ℹ Página ${pagina}: ${res.itemsTotal} conversas, todas Autoflix/outros — sem EJA para verificar`)
        continue
      }

      resultados.push(res)
      totalFaltando += res.faltando.length
      paginasComDados++

      const pct = Math.round((res.sincronizadas / res.ejasTotal) * 100)
      const status = res.faltando.length === 0 ? '✓' : '⚠'
      onLog(`${status} Página ${pagina}: ${res.sincronizadas}/${res.ejasTotal} EJA sincronizadas (${pct}%) — ${res.itemsTotal} total na página`)
    } catch (err) {
      onLog(`⚠ Erro na página ${pagina}: ${err.message}`)
    }
  }

  // Total no banco
  const { count: totalBanco } = await supabase
    .from('ci_conversas')
    .select('*', { count: 'exact', head: true })
    .not('datacrazy_id', 'is', null)

  onLog(`ℹ Total no banco: ${(totalBanco ?? 0).toLocaleString('pt-BR')} conversas sincronizadas`)
  onLog(`ℹ Páginas verificadas com dados: ${paginasComDados} de ${paginas.length} amostradas`)

  if (totalFaltando === 0) {
    onLog(`✓ Cobertura OK — todas as amostras estão 100% sincronizadas`)
  } else {
    onLog(`⚠ ${totalFaltando} conversas nas amostras não encontradas — rode sync COMPLETO`)
  }

  return { resultados, totalFaltando, totalBanco, paginasComDados }
}
