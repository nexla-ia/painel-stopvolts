import { CSSProperties, useEffect, useRef } from 'react';
import { ConteudoEmail } from '../../lib/email';
import { Image as ImageIcon, Link2, Smile } from 'lucide-react';

interface EmailCanvasProps {
  conteudo: ConteudoEmail;
  onChange: (c: ConteudoEmail) => void;
}

/** Emojis usuais para o círculo do topo. */
const EMOJIS = ['💡', '⚡', '✅', '📢', '🎉', '💰', '📊', '🔔', ''];

/**
 * Campo de texto que cresce com o conteúdo.
 *
 * Um textarea de altura fixa quebraria a ilusão de estar escrevendo dentro do
 * e-mail — o texto rolaria dentro de uma caixa em vez de empurrar o cartão.
 */
function AutoTextarea({
  value,
  onChange,
  className,
  style,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  className: string;
  style: CSSProperties;
  placeholder: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={1}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={style}
      className={`w-full bg-transparent border-0 outline-none resize-none overflow-hidden rounded
        focus:ring-2 focus:ring-[#B45F04]/40 hover:bg-black/[0.03] transition-colors ${className}`}
    />
  );
}

/**
 * O e-mail renderizado com os textos editáveis no lugar.
 *
 * As cores são fixas de propósito: isto reproduz o e-mail como ele chega na
 * caixa de entrada, que não muda com o tema do painel.
 */
export default function EmailCanvas({ conteudo, onChange }: EmailCanvasProps) {
  const set = (campo: keyof ConteudoEmail, valor: string) => onChange({ ...conteudo, [campo]: valor });

  const campoBase = 'placeholder:text-[#C4C8CE]';

  return (
    <div className="rounded-xl border-2 border-edge overflow-hidden">
      <div className="px-4 py-2.5 bg-edge/20 border-b border-edge flex items-center gap-2">
        <span className="text-sm text-muted">Clique em qualquer texto abaixo para editar</span>
      </div>

      {/* Fundo do e-mail */}
      <div className="p-6 sm:p-10" style={{ background: '#F9FAFB' }}>
        <div className="mx-auto" style={{ maxWidth: '480px' }}>
          {/* Cabeçalho com logo */}
          <div className="text-center mb-7">
            {conteudo.logoUrl.trim() ? (
              <img
                src={conteudo.logoUrl}
                alt="StopVolts"
                className="w-12 h-12 rounded-[10px] block mx-auto mb-3 object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-[10px] mx-auto mb-3 flex items-center justify-center"
                style={{ background: '#B45F04' }}
              >
                <span className="text-white text-2xl font-bold">S</span>
              </div>
            )}
            <span
              className="text-[13px] font-semibold uppercase"
              style={{ color: '#9CA3AF', letterSpacing: '0.5px' }}
            >
              StopVolts
            </span>
          </div>

          {/* Cartão */}
          <div
            className="rounded-2xl px-8 py-9"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
            }}
          >
            {/* Emoji */}
            <div className="flex justify-center mb-5">
              <div className="relative group">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px]"
                  style={{ background: '#FEF3C7' }}
                >
                  {conteudo.emoji || <Smile className="w-5 h-5" style={{ color: '#B45F04' }} />}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <div className="flex gap-1 p-1.5 rounded-lg bg-elevated border border-edge shadow-lg">
                    {EMOJIS.map(e => (
                      <button
                        key={e || 'nenhum'}
                        type="button"
                        onClick={() => set('emoji', e)}
                        title={e || 'Sem ícone'}
                        className={`w-8 h-8 rounded flex items-center justify-center text-lg hover:bg-edge/50 transition-colors ${
                          conteudo.emoji === e ? 'bg-volt-soft' : ''
                        }`}
                      >
                        {e || <span className="text-xs text-faint">—</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <AutoTextarea
              value={conteudo.titulo}
              onChange={v => set('titulo', v)}
              placeholder="Título do e-mail"
              ariaLabel="Título do e-mail"
              className={`${campoBase} text-center font-bold text-[21px] leading-tight mb-4 px-1`}
              style={{ color: '#111827' }}
            />

            <AutoTextarea
              value={conteudo.corpo}
              onChange={v => set('corpo', v)}
              placeholder="Escreva aqui a mensagem. Deixe uma linha em branco para separar parágrafos."
              ariaLabel="Mensagem do e-mail"
              className={`${campoBase} text-center text-[15px] leading-[1.7] mb-7 px-1`}
              style={{ color: '#6B7280' }}
            />

            {/* Botão */}
            <div className="text-center space-y-2.5">
              <div
                className="inline-block rounded-[10px] px-2"
                style={{ background: conteudo.botaoTexto.trim() ? '#B45F04' : 'transparent' }}
              >
                <input
                  type="text"
                  value={conteudo.botaoTexto}
                  onChange={e => set('botaoTexto', e.target.value)}
                  placeholder="Texto do botão"
                  aria-label="Texto do botão"
                  size={Math.max(conteudo.botaoTexto.length || 14, 8)}
                  className="bg-transparent border-0 outline-none text-center font-semibold text-[15px] py-3.5 px-6 rounded-[10px] focus:ring-2 focus:ring-white/50"
                  style={{ color: conteudo.botaoTexto.trim() ? '#FFFFFF' : '#9CA3AF' }}
                />
              </div>

              <div className="flex items-center justify-center gap-2">
                <Link2 className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                <input
                  type="url"
                  value={conteudo.botaoUrl}
                  onChange={e => set('botaoUrl', e.target.value)}
                  placeholder="Para onde o botão leva (https://...)"
                  aria-label="Endereço do botão"
                  className="bg-transparent border-0 outline-none text-center text-xs rounded px-2 py-1 w-64 max-w-full focus:ring-2 focus:ring-[#B45F04]/40 hover:bg-black/[0.03] transition-colors"
                  style={{ color: '#6B7280' }}
                />
              </div>

              {!conteudo.botaoUrl.trim() && conteudo.botaoTexto.trim() && (
                <p className="text-xs" style={{ color: '#B45F04' }}>
                  Sem endereço, o botão não entra no e-mail.
                </p>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-7">
            <AutoTextarea
              value={conteudo.rodape}
              onChange={v => set('rodape', v)}
              placeholder="Rodapé"
              ariaLabel="Rodapé do e-mail"
              className={`${campoBase} text-center text-xs px-1`}
              style={{ color: '#9CA3AF' }}
            />
          </div>

          {/* Logo: fora do e-mail, só configuração */}
          <div className="mt-8 pt-5 border-t" style={{ borderColor: '#E5E7EB' }}>
            <label
              className="flex items-center gap-2 text-xs mb-1.5"
              style={{ color: '#6B7280' }}
              htmlFor="email-logo"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Endereço do logo (precisa estar hospedado na internet)
            </label>
            <input
              id="email-logo"
              type="url"
              value={conteudo.logoUrl}
              onChange={e => set('logoUrl', e.target.value)}
              placeholder="https://... /logonew.png — deixe vazio para usar o bloco laranja"
              className="w-full bg-white border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#B45F04]/40"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
