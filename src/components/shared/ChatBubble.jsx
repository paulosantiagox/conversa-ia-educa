import { useState, useRef, useEffect } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Play, Pause, ChevronDown, ChevronUp } from 'lucide-react'

const formatarTimestamp = (enviado_at) => {
  if (!enviado_at) return '–'
  const data = new Date(enviado_at)
  if (isToday(data)) return format(data, 'HH:mm')
  if (isYesterday(data)) return 'Ontem ' + format(data, 'HH:mm')
  return format(data, "dd/MM 'às' HH:mm", { locale: ptBR })
}

const SPEEDS = [1, 1.5, 2]

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function AudioPlayer({ mensagem, isLead }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(mensagem.duracao_segundos || 0)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [showTranscricao, setShowTranscricao] = useState(false)

  const bubbleBg = isLead
    ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
    : 'bg-blue-900 dark:bg-blue-800 border-blue-800 dark:border-blue-700'
  const textColor = isLead ? 'text-slate-700 dark:text-slate-300' : 'text-blue-100'
  const barBg = isLead ? 'bg-slate-300 dark:bg-slate-500' : 'bg-blue-700 dark:bg-blue-600'
  const barFill = isLead ? 'bg-slate-600 dark:bg-slate-200' : 'bg-white'

  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else { el.play().catch(() => {}); setPlaying(true) }
  }

  function onTimeUpdate() {
    const el = audioRef.current
    if (el) setCurrent(el.currentTime)
  }

  function onLoadedMetadata() {
    const el = audioRef.current
    if (el && el.duration && !isNaN(el.duration)) setDuration(el.duration)
  }

  function onEnded() { setPlaying(false); setCurrent(0) }

  function seek(e) {
    const el = audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    el.currentTime = ratio * duration
    setCurrent(el.currentTime)
  }

  function cycleSpeed() {
    const el = audioRef.current
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    if (el) el.playbackRate = SPEEDS[next]
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div className={`border rounded-[6px] overflow-hidden ${bubbleBg}`} style={{ minWidth: 220 }}>
      {/* Áudio oculto */}
      {mensagem.audio_url && (
        <audio
          ref={audioRef}
          src={mensagem.audio_url}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={onEnded}
          preload="metadata"
        />
      )}

      {/* Controles */}
      <div className="flex items-center gap-2 px-2.5 py-2" style={{ height: 40 }}>
        <button
          onClick={toggle}
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            isLead ? 'bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-800 hover:bg-slate-600 dark:hover:bg-slate-100' : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          {playing ? <Pause size={10} /> : <Play size={10} />}
        </button>

        {/* Barra de progresso */}
        <div className="flex-1 flex flex-col gap-0.5">
          <div
            className={`relative h-1.5 rounded-full cursor-pointer ${barBg}`}
            onClick={seek}
          >
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-none ${barFill}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={`flex justify-between text-[9px] ${textColor} opacity-70`}>
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Velocidade */}
        <button
          onClick={cycleSpeed}
          className={`text-[10px] font-semibold px-1 rounded border shrink-0 ${
            isLead
              ? 'border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              : 'border-blue-700 dark:border-blue-600 text-blue-200 hover:bg-blue-800 dark:hover:bg-blue-700'
          }`}
        >
          {SPEEDS[speedIdx]}x
        </button>

        {/* Transcrição toggle */}
        {mensagem.transcricao && (
          <button
            onClick={() => setShowTranscricao(v => !v)}
            className={`text-[10px] shrink-0 ${textColor} opacity-70 hover:opacity-100`}
            title="Ver transcrição"
          >
            {showTranscricao ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Transcrição expandida */}
      {showTranscricao && mensagem.transcricao && (
        <div className={`px-2.5 pb-2 text-[11px] italic border-t ${
          isLead ? 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400' : 'border-blue-800 dark:border-blue-700 text-blue-200'
        }`}>
          <p className="pt-1.5 leading-relaxed">{mensagem.transcricao}</p>
        </div>
      )}
    </div>
  )
}

export function ChatBubble({ mensagem }) {
  if (!mensagem) return null
  const isLead = mensagem.de === 'lead' || mensagem.de === 'contato'

  const hora = formatarTimestamp(mensagem.enviado_at)
  const dataCompleta = mensagem.enviado_at
    ? format(new Date(mensagem.enviado_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null

  return (
    <div className={`flex ${isLead ? 'justify-start' : 'justify-end'} mb-2`}>
      <div className="max-w-[75%]">
        {(mensagem.tipo === 'audio' || mensagem.audio_url) ? (
          <AudioPlayer mensagem={mensagem} isLead={isLead} />
        ) : (
          <div
            className={`px-3 py-2 rounded-lg text-[12px] leading-relaxed ${
              isLead
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                : 'bg-blue-900 dark:bg-blue-800 text-white rounded-tr-none'
            }`}
          >
            {mensagem.conteudo}
          </div>
        )}
        <div
          className={`text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 ${isLead ? 'text-left' : 'text-right'}`}
          title={dataCompleta ?? undefined}
        >
          {hora}
        </div>
      </div>
    </div>
  )
}
