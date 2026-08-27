import { CORES_EMAIL, ConteudoEmail, LOGO_URL, TONS, TomEmail } from '../../lib/email';
import { Link2, Bold } from 'lucide-react';
import RichTextArea from './RichTextArea';

interface EmailCanvasProps {
  conteudo: ConteudoEmail;
  onChange: (c: ConteudoEmail) => void;
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
      {/* Barra de ferramentas */}
      <div className="px-4 py-3 bg-edge/20 border-b border-edge flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="flex items-center gap-2 text-sm text-muted">
          <Bold className="w-4 h-4 shrink-0" />
          Escreva <code className="font-mono text-xs bg-edge/60 px-1.5 py-0.5 rounded">*assim*</code> para
          destacar
        </span>

        <div className="flex items-center gap-2.5 ml-auto">
          <span className="text-sm text-muted shrink-0">Cor</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(TONS) as TomEmail[]).map(chave => (
              <button
                key={chave}
                type="button"
                onClick={() => set('tom', chave)}
                title={TONS[chave].rotulo}
                aria-label={`Cor ${TONS[chave].rotulo}`}
                aria-pressed={conteudo.tom === chave}
                className={`w-6 h-6 rounded-full transition-transform hover:scale-125 ${
                  conteudo.tom === chave ? 'ring-2 ring-offset-2 ring-offset-panel ring-fg/50 scale-110' : ''
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
            <img
              src={LOGO_URL}
              alt="StopVolts"
              width={48}
              height={48}
              className="w-12 h-12 rounded-[10px] block mx-auto mb-3 object-cover"
            />
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
              <RichTextArea
                value={conteudo.titulo}
                onChange={v => set('titulo', v)}
                placeholder="Título do e-mail"
                ariaLabel="Título do e-mail"
                destacar
                className="text-center px-1 py-0.5 mb-3"
                style={{
                  color: c.titulo,
                  fontSize: '21px',
                  fontWeight: 700,
                  lineHeight: 1.25,
                }}
              />

              <RichTextArea
                value={conteudo.corpo}
                onChange={v => set('corpo', v)}
                placeholder="Escreva a mensagem. Deixe uma linha em branco entre parágrafos."
                ariaLabel="Mensagem do e-mail"
                destacar
                className="text-center px-1 py-0.5 mb-7"
                style={{ color: c.texto, fontSize: '15px', lineHeight: 1.7 }}
              />

              <div className="text-center space-y-2.5">
                <div
                  className="inline-block rounded-[10px] transition-shadow"
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
            <RichTextArea
              value={conteudo.rodape}
              onChange={v => set('rodape', v)}
              placeholder="Rodapé"
              ariaLabel="Rodapé do e-mail"
              className="text-center px-1 py-0.5"
              style={{ color: c.fraco, fontSize: '12px', lineHeight: 1.6 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
