import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Mic } from 'lucide-react'

export function ChatBubble({ mensagem }) {
  const isLead = mensagem.de === 'lead'
  const hora = mensagem.enviado_at
    ? format(new Date(mensagem.enviado_at), 'HH:mm', { locale: ptBR })
    : ''

  return (
    <div className={`flex ${isLead ? 'justify-start' : 'justify-end'} mb-2`}>
      <div className={`max-w-[75%] ${isLead ? '' : ''}`}>
        <div
          className={`px-3 py-2 rounded-lg text-[12px] leading-relaxed ${
            isLead
              ? 'bg-slate-100 text-slate-800 rounded-tl-none'
              : 'bg-blue-900 text-white rounded-tr-none'
          }`}
        >
          {mensagem.tipo === 'audio' ? (
            <div className="flex items-center gap-2">
              <Mic size={12} />
              <span className="text-[11px] italic">Áudio {mensagem.duracao_segundos ? `(${mensagem.duracao_segundos}s)` : ''}</span>
              {mensagem.transcricao && (
                <span className="text-[11px] opacity-75">— {mensagem.transcricao}</span>
              )}
            </div>
          ) : (
            mensagem.conteudo
          )}
        </div>
        <div className={`text-[10px] text-slate-400 mt-0.5 ${isLead ? 'text-left' : 'text-right'}`}>
          {hora}
        </div>
      </div>
    </div>
  )
}
