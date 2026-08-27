import { useState } from 'react';
import { Profile } from '../../lib/supabase';
import { ConteudoEmail, ModoConteudo, aplicarVariaveis, primeiroNome } from '../../lib/email';
import { PenLine, Code2, Eye, Pencil, Mail } from 'lucide-react';
import EmailCanvas from './EmailCanvas';
import { bigInput, bigLabel, helpText } from '../broadcast/ui';

interface EmailComposeStepProps {
  titulo: string;
  onTituloChange: (v: string) => void;
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
  titulo,
  onTituloChange,
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
    <div className="space-y-7">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className={bigLabel} htmlFor="email-titulo">
            Que assunto é este e-mail?
          </label>
          <input
            id="email-titulo"
            type="text"
            value={titulo}
            onChange={e => onTituloChange(e.target.value)}
            className={bigInput}
            placeholder="Ex: Novidades de setembro"
          />
          <p className={helpText}>Só você vê. Serve para achar este envio depois.</p>
        </div>

        <div>
          <label className={bigLabel} htmlFor="email-assunto">
            Assunto que a pessoa vê na caixa de entrada
          </label>
          <input
            id="email-assunto"
            type="text"
            value={assunto}
            onChange={e => onAssuntoChange(e.target.value)}
            className={bigInput}
            placeholder="{{primeiro_nome}}, sua conta de luz pode cair"
          />
          <p className={helpText}>
            {assunto.trim() ? (
              <>
                Chega assim para {nomeExemplo}: <strong className="text-fg">{assuntoFinal}</strong>
              </>
            ) : (
              'Também vira o título dentro do e-mail, até você mudar o título por lá.'
            )}
          </p>
        </div>
      </div>

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
          <div className="px-4 py-3 bg-edge/20 border-b border-edge">
            <p className="text-xs text-faint mb-1">Assunto</p>
            <p className="text-base font-semibold text-fg break-words">{assuntoFinal || 'Sem assunto'}</p>
            <p className="text-sm text-muted mt-1.5 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              {exemplo?.email || 'exemplo@email.com'}
            </p>
          </div>
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
