import { CSSProperties, useEffect, useRef } from 'react';
import { CORES_EMAIL, ConteudoEmail, TONS, TomEmail } from '../../lib/email';
import { Link2 } from 'lucide-react';

interface EmailCanvasProps {
  conteudo: ConteudoEmail;
  onChange: (c: ConteudoEmail) => void;
}

/**
 * Campo de texto que cresce com o conteúdo.
 *
 * Um textarea de altura fixa quebraria a ideia de estar escrevendo dentro do
 * e-mail — o texto rolaria numa caixa em vez de empurrar o cartão para baixo.
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
        hover:bg-black/[0.03] focus:bg-black/[0.03] focus:ring-2 focus:ring-black/10 transition-colors ${className}`}
    />
  );
}

/**
 * O e-mail montado, com os textos editáveis no próprio lugar.
 *
 * As cores são literais de propósito: isto reproduz o e-mail como ele chega na
 * caixa de entrada, que não acompanha o tema do painel.
 */
export default function EmailCanvas({ conteudo, onChange }: EmailCanvasProps) {
  const set = (campo: keyof ConteudoEmail, valor: string) => onChange({ ...conteudo, [campo]: valor });
  const tom = TONS[conteudo.tom] ?? TONS.verde;
  const c = CORES_EMAIL;

  return (
    <div className="rounded-xl border-2 border-edge overflow-hidden">
      {/* Barra de ferramentas do e-mail */}
      <div className="px-4 py-3 bg-edge/20 border-b border-edge flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="text-sm text-muted">Clique em qualquer texto para editar</span>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted">Cor de destaque</span>
          <div className="flex gap-1.5">
            {(Object.keys(TONS) as TomEmail[]).map(chave => (
              <button
                key={chave}
                type="button"
                onClick={() => set('tom', chave)}
                title={TONS[chave].rotulo}
                aria-label={`Cor ${TONS[chave].rotulo}`}
                aria-pressed={conteudo.tom === chave}
                className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                  conteudo.tom === chave ? 'ring-2 ring-offset-2 ring-offset-panel ring-fg/40' : ''
                }`}
                style={{ background: TONS[chave].cor }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fundo do e-mail */}
      <div className="p-6 sm:p-10" style={{ background: c.fundo }}>
        <div className="mx-auto" style={{ maxWidth: '480px' }}>
          {/* Cabeçalho */}
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
                style={{ background: tom.cor }}
              >
                <span className="text-white text-2xl font-bold">S</span>
              </div>
            )}
            <span
              className="text-[13px] font-semibold uppercase"
              style={{ color: c.fraco, letterSpacing: '0.5px' }}
            >
              StopVolts
            </span>
          </div>

          {/* Cartão */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: c.cartao,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ height: '4px', background: tom.cor }} />

            <div className="px-8 py-9">
              <AutoTextarea
                value={conteudo.titulo}
                onChange={v => set('titulo', v)}
                placeholder="Título do e-mail"
                ariaLabel="Título do e-mail"
                className="text-center font-bold text-[21px] leading-tight mb-4 px-1 placeholder:text-[#C4C8CE]"
                style={{ color: c.titulo }}
              />

              <AutoTextarea
                value={conteudo.corpo}
                onChange={v => set('corpo', v)}
                placeholder="Escreva a mensagem. Deixe uma linha em branco entre parágrafos."
                ariaLabel="Mensagem do e-mail"
                className="text-center text-[15px] leading-[1.7] mb-7 px-1 placeholder:text-[#C4C8CE]"
                style={{ color: c.texto }}
              />

              <div className="text-center space-y-2.5">
                <div
                  className="inline-block rounded-[10px]"
                  style={{
                    background: conteudo.botaoTexto.trim() ? tom.cor : 'transparent',
                    boxShadow: conteudo.botaoTexto.trim() ? `0 2px 6px ${tom.sombra}` : 'none',
                  }}
                >
                  <input
                    type="text"
                    value={conteudo.botaoTexto}
                    onChange={e => set('botaoTexto', e.target.value)}
                    placeholder="Texto do botão"
                    aria-label="Texto do botão"
                    size={Math.max(conteudo.botaoTexto.length || 14, 10)}
                    className="bg-transparent border-0 outline-none text-center font-semibold text-[15px] py-3.5 px-8 rounded-[10px] focus:ring-2 focus:ring-white/60"
                    style={{ color: conteudo.botaoTexto.trim() ? '#FFFFFF' : c.fraco }}
                  />
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: c.fraco }} />
                  <input
                    type="url"
                    value={conteudo.botaoUrl}
                    onChange={e => set('botaoUrl', e.target.value)}
                    placeholder="Endereço para onde o botão leva"
                    aria-label="Endereço do botão"
                    className="bg-transparent border-0 outline-none text-center text-xs rounded px-2 py-1 w-72 max-w-full hover:bg-black/[0.03] focus:bg-black/[0.03] focus:ring-2 focus:ring-black/10 transition-colors"
                    style={{ color: c.texto }}
                  />
                </div>

                {conteudo.botaoTexto.trim() && !conteudo.botaoUrl.trim() && (
                  <p className="text-xs" style={{ color: tom.cor }}>
                    Sem endereço, o botão não entra no e-mail.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-7">
            <AutoTextarea
              value={conteudo.rodape}
              onChange={v => set('rodape', v)}
              placeholder="Rodapé"
              ariaLabel="Rodapé do e-mail"
              className="text-center text-xs px-1 placeholder:text-[#C4C8CE]"
              style={{ color: c.fraco }}
            />
          </div>
        </div>
      </div>

      {/* Ajuste que não faz parte do e-mail */}
      <div className="px-4 py-3 bg-edge/20 border-t border-edge">
        <label
          className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted"
          htmlFor="email-logo"
        >
          <span className="shrink-0">Logo (precisa estar hospedado na internet)</span>
          <input
            id="email-logo"
            type="url"
            value={conteudo.logoUrl}
            onChange={e => set('logoUrl', e.target.value)}
            placeholder="https://.../logo.png — vazio usa o quadrado com a inicial"
            className="flex-1 min-w-[16rem] bg-ink border border-edge rounded-md px-3 py-2 text-sm text-fg placeholder-faint outline-none focus:border-volt focus:ring-2 focus:ring-volt/20 transition-colors"
          />
        </label>
      </div>
    </div>
  );
}
