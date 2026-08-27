import { useState } from 'react';
import { Profile } from '../../lib/supabase';
import { ConteudoEmail, ModoConteudo, aplicarVariaveis, primeiroNome } from '../../lib/email';
import { PenLine, Code2, Eye, Pencil } from 'lucide-react';
import EmailCanvas from './EmailCanvas';
import { bigInput, bigLabel, helpText } from '../broadcast/ui';

interface EmailComposeStepProps {
  assunto: string;
  onAssuntoChange: (v: string) => void;
  modo: ModoConteudo;
  onModoChange: (v: ModoConteudo) => void;
  conteudo: ConteudoEmail;
  onConteudoChange: (v: ConteudoEmail) => void;
  htmlCru: string;
  onHtmlCruChange: (v: string) => void;
  /** Pessoa usada para mostrar o resultado com os dados reais. */
  exemplo: Profile | null;
  /** HTML já personalizado para o exemplo. */
  htmlPrevia: string;
}

export default function EmailComposeStep({
  assunto,
  onAssuntoChange,
  modo,
  onModoChange,
  conteudo,
  onConteudoChange,
  htmlCru,
  onHtmlCruChange,
  exemplo,
  htmlPrevia,
}: EmailComposeStepProps) {
  const [vendoResultado, setVendoResultado] = useState(false);

  const nomeExemplo = primeiroNome(exemplo?.full_name ?? null) || 'Maria';
  const assuntoFinal = exemplo ? aplicarVariaveis(assunto, exemplo) : assunto;

  const abaClass = (ativa: boolean) =>
    `flex items-center gap-2.5 px-5 py-3 text-base font-semibold rounded-lg transition-colors ${
      ativa ? 'bg-volt text-volt-ink shadow-md shadow-volt/20' : 'text-muted hover:text-fg hover:bg-edge/30'
    }`;

  return (
    <div className="space-y-6">
      {/* Cabeçalho no formato do Gmail: para quem vai, e o assunto */}
      <div className="rounded-xl border-2 border-edge overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-edge">
          <span className="text-base text-faint w-16 shrink-0">Para</span>
          <span className="text-base text-fg">
            {exemplo ? (
              <>
                <strong className="font-semibold">{exemplo.full_name || exemplo.email}</strong>
                <span className="text-muted"> e os demais escolhidos no próximo passo</span>
              </>
            ) : (
              <span className="text-muted">Ninguém disponível</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 px-5 py-1.5">
          <label className="text-base text-faint w-16 shrink-0" htmlFor="email-assunto">
            Assunto
          </label>
          <input
            id="email-assunto"
            type="text"
            value={assunto}
            onChange={e => onAssuntoChange(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none py-3 text-lg text-fg placeholder-faint"
            placeholder="Sua conta de luz pode cair neste mês"
          />
        </div>
      </div>

      <p className={helpText}>
        {assunto.trim() ? (
          <>
            {nomeExemplo} vê <strong className="text-fg">{assuntoFinal}</strong> na caixa de entrada, e o
            mesmo texto como título dentro do e-mail.
          </>
        ) : (
          'O assunto aparece na caixa de entrada e também como título dentro do e-mail.'
        )}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-edge/25">
          <button
            type="button"
            onClick={() => onModoChange('escrever')}
            className={abaClass(modo === 'escrever')}
          >
            <PenLine className="w-5 h-5" />
            Escrever no e-mail
          </button>
          <button type="button" onClick={() => onModoChange('html')} className={abaClass(modo === 'html')}>
            <Code2 className="w-5 h-5" />
            Colar um HTML pronto
          </button>
        </div>

        <button
          type="button"
          onClick={() => setVendoResultado(v => !v)}
          className="flex items-center gap-2.5 px-5 py-3 text-base font-semibold rounded-lg border-2 border-edge text-fg hover:bg-edge/30 transition-colors"
        >
          {vendoResultado ? <Pencil className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          {vendoResultado ? 'Voltar a editar' : `Ver como chega para ${nomeExemplo}`}
        </button>
      </div>

      {vendoResultado ? (
        <div className="rounded-xl border-2 border-edge overflow-hidden">
          {/* iframe isola o CSS do e-mail para não brigar com o do painel */}
          <iframe
            title="Como o e-mail chega"
            srcDoc={htmlPrevia}
            sandbox=""
            className="w-full h-[38rem] bg-white border-0"
          />
        </div>
      ) : modo === 'escrever' ? (
        <EmailCanvas conteudo={conteudo} onChange={onConteudoChange} />
      ) : (
        <div>
          <label className={bigLabel} htmlFor="email-html">
            Cole aqui o HTML
          </label>
          <textarea
            id="email-html"
            value={htmlCru}
            onChange={e => onHtmlCruChange(e.target.value)}
            rows={18}
            spellCheck={false}
            className={`${bigInput} resize-y font-mono text-sm leading-relaxed`}
            placeholder={'<div style="...">\n  ...\n</div>'}
          />
          <p className={helpText}>
            Pode ser um trecho ou uma página inteira. Escreva{' '}
            <code className="font-mono text-sm">{'{{primeiro_nome}}'}</code> onde quiser o nome da pessoa.
          </p>
        </div>
      )}
    </div>
  );
}
