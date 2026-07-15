import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Transcrição de áudio server-side (Whisper) — a OpenAI bloqueia a chamada
// direta do navegador (CORS no /audio/transcriptions). Aqui roda no servidor,
// sem CORS, e a chave OpenAI fica como secret (não exposta no bundle).
// Recebe: { audio_url, datacrazy_id }  →  { ok, text, duracao_segundos } | { ok:false, tipo }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ ok: false, tipo: "erro", mensagem: "use POST" }, 405)

  try {
    const { audio_url, datacrazy_id } = await req.json()
    if (!audio_url) return json({ ok: false, tipo: "erro", mensagem: "audio_url ausente" })

    // Whitelist de domínio — evita abuso da função com URLs arbitrárias
    let host = ""
    try { host = new URL(audio_url).hostname } catch { return json({ ok: false, tipo: "erro", mensagem: "url inválida" }) }
    const permitido = host.endsWith("datacrazy.io") || host.endsWith("amazonaws.com")
    if (!permitido) return json({ ok: false, tipo: "erro", mensagem: "domínio não permitido: " + host })

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
    if (!OPENAI_API_KEY) return json({ ok: false, tipo: "erro", mensagem: "OPENAI_API_KEY não configurada no servidor" })

    // Baixa o áudio server-side, com retry (o CDN g1cdn1.datacrazy.io dá falhas transitórias)
    let blob: Blob | null = null
    let lastStatus = 0
    for (let t = 1; t <= 3; t++) {
      try {
        const r = await fetch(audio_url)
        if (r.ok) { blob = await r.blob(); break }
        lastStatus = r.status
        if (r.status === 404 || r.status === 403) break  // definitivo
      } catch (_) { /* rede — retenta */ }
      if (t < 3) await new Promise((res) => setTimeout(res, 600 * t))
    }
    if (!blob) {
      if (lastStatus === 404 || lastStatus === 403) return json({ ok: false, tipo: "inacessivel", httpStatus: lastStatus })
      return json({ ok: false, tipo: "erro", mensagem: "download falhou (status " + lastStatus + ")" })
    }

    const form = new FormData()
    form.append("file", blob, `${datacrazy_id ?? "audio"}.ogg`)
    form.append("model", "whisper-1")
    form.append("language", "pt")
    form.append("response_format", "verbose_json")

    const oai = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    })
    if (!oai.ok) {
      const detalhe = (await oai.text()).slice(0, 300)
      if (oai.status === 429 || /quota|insufficient_quota/i.test(detalhe)) return json({ ok: false, tipo: "quota" })
      return json({ ok: false, tipo: "erro", mensagem: `openai ${oai.status}: ${detalhe}` })
    }
    const data = await oai.json()
    return json({ ok: true, text: data.text ?? "", duracao_segundos: data.duration ?? 0 })
  } catch (e) {
    return json({ ok: false, tipo: "erro", mensagem: String((e as Error)?.message ?? e) })
  }
})
