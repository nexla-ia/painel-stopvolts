import { Profile } from '../../lib/supabase';
import { BotaoEmail, ModoConteudo, VARIAVEIS, primeiroNome } from '../../lib/email';
import { PenLine, Code2, Mail } from 'lucide-react';
import { bigInput, bigLabel, helpText } from '../broadcast/ui';

interface EmailComposeStepProps {
  titulo: string;
  onTituloChange: (v: string) => void;
  assunto: string;
  onAssuntoChange: (v: string) => void;
  modo: ModoConteudo;
  onModoChange: (v: ModoConteudo) => void;
  saudacao: string;
  onSaudacaoChange: (v: string) => void;
  corpo: string;
  onCorpoChange: (v: string) => void;
  botao: BotaoEmail;
  onBotaoChange: (v: BotaoEmail) => void;
  assinatura: string;
  onAssinaturaChange: (v: string) => void;
  htmlCru: string;
  onHtmlCruChange: (v: string) => void;
  /** Pessoa usada como exemplo na prévia. */
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
  saudacao,
  onSaudacaoChange,
  corpo,
  onCorpoChange,
  botao,
  onBotaoChange,
  assinatura,
  onAssinaturaChange,
  htmlCru,
  onHtmlCruChange,
  exemplo,
  htmlPrevia,
}: EmailComposeStepProps) {
  const nomeExemplo = primeiroNome(exemplo?.full_name ?? null) || 'Maria';

  const abaClass = (ativa: boolean) =>
    `flex items-center gap-2.5 px-5 py-3 text-base font-semibold rounded-lg transition-colors ${
      ativa ? 'bg-volt text-volt-ink shadow-md shadow-volt/20' : 'text-muted hover:text-fg hover:bg-edge/30'
    }`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_26rem] gap-8 items-start">
      <div className="space-y-7">
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
          <p className={helpText}>Só você vê. Serve para achar este envio depois na lista.</p>
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
            placeholder="Ex: {{primeiro_nome}}, sua conta de luz pode cair"
          />
          <p className={helpText}>
            É a primeira coisa que aparece. Escreva algo curto e direto — até uns 50 caracteres.
          </p>
        </div>

        <div>
          <p className={bigLabel}>Como quer montar o e-mail?</p>
          <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-edge/25 w-fit">
            <button
              type="button"
              onClick={() => onModoChange('escrever')}
              className={abaClass(modo === 'escrever')}
            >
              <PenLine className="w-5 h-5" />
              Escrever o texto
            </button>
            <button type="button" onClick={() => onModoChange('html')} className={abaClass(modo === 'html')}>
              <Code2 className="w-5 h-5" />
              Colar um HTML pronto
            </button>
          </div>
        </div>

        {modo === 'escrever' ? (
          <>
            <div>
              <label className={bigLabel} htmlFor="email-saudacao">
                Saudação
              </label>
              <input
                id="email-saudacao"
                type="text"
                value={saudacao}
                onChange={e => onSaudacaoChange(e.target.value)}
                className={bigInput}
                placeholder="Olá, {{primeiro_nome}}!"
              />
            </div>

            <div>
              <label className={bigLabel} htmlFor="email-corpo">
                Mensagem
              </label>
              <textarea
                id="email-corpo"
                value={corpo}
                onChange={e => onCorpoChange(e.target.value)}
                rows={10}
                className={`${bigInput} resize-y leading-relaxed`}
                placeholder={
                  'A bandeira tarifária mudou para vermelha neste mês.\n\nIsso significa um acréscimo na conta de luz de todo mundo. No aplicativo você consegue ver quais aparelhos mais pesam...'
                }
              />
              <p className={helpText}>Deixe uma linha em branco entre um parágrafo e outro.</p>
            </div>

            <div className="rounded-lg border-2 border-edge p-5 space-y-4">
              <p className="text-base font-semibold text-fg">
                Botão <span className="text-muted font-normal">(opcional)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={botao.texto}
                  onChange={e => onBotaoChange({ ...botao, texto: e.target.value })}
                  className={`${bigInput} py-3 text-base`}
                  placeholder="Abrir o aplicativo"
                />
                <input
                  type="url"
                  value={botao.url}
                  onChange={e => onBotaoChange({ ...botao, url: e.target.value })}
                  className={`${bigInput} py-3 text-base`}
                  placeholder="https://..."
                />
              </div>
              <p className={helpText}>Preencha os dois campos para o botão aparecer.</p>
            </div>

            <div>
              <label className={bigLabel} htmlFor="email-assinatura">
                Rodapé
              </label>
              <textarea
                id="email-assinatura"
                value={assinatura}
                onChange={e => onAssinaturaChange(e.target.value)}
                rows={3}
                className={`${bigInput} resize-y text-base`}
              />
            </div>
          </>
        ) : (
          <div>
            <label className={bigLabel} htmlFor="email-html">
              Cole aqui o HTML
            </label>
            <textarea
              id="email-html"
              value={htmlCru}
              onChange={e => onHtmlCruChange(e.target.value)}
              rows={16}
              spellCheck={false}
              className={`${bigInput} resize-y font-mono text-sm leading-relaxed`}
              placeholder={'<!doctype html>\n<html>\n  ...'}
            />
            <p className={helpText}>Use as variáveis abaixo dentro do HTML para personalizar cada pessoa.</p>
          </div>
        )}

        <div className="rounded-lg border-2 border-edge p-5">
          <p className="text-base font-semibold text-fg mb-3">
            Escreva isto para o sistema trocar pelos dados de cada pessoa
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {VARIAVEIS.map(v => (
              <p key={v.chave} className="text-base text-muted flex items-baseline gap-2">
                <code className="font-mono text-sm bg-edge/50 px-1.5 py-0.5 rounded text-fg shrink-0">
                  {v.chave}
                </code>
                {v.descricao}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="xl:sticky xl:top-2 space-y-3">
        <div className="rounded-xl border-2 border-edge bg-edge/15 p-4">
          <p className="text-xs uppercase tracking-wider text-faint mb-3 text-center">
            Como chega para {nomeExemplo}
          </p>

          <div className="rounded-lg border border-edge bg-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-edge">
              <p className="text-xs text-faint mb-1">Assunto</p>
              <p className="text-base font-semibold text-fg break-words">
                {assunto.trim() ? aplicarNoExemplo(assunto, exemplo) : 'Sem assunto'}
              </p>
              <p className="text-sm text-muted mt-2 flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {exemplo?.email || 'exemplo@email.com'}
              </p>
            </div>

            {/* iframe isola o CSS do e-mail: sem isso o estilo dele briga com o do painel */}
            <iframe
              title="Prévia do e-mail"
              srcDoc={htmlPrevia}
              sandbox=""
              className="w-full h-[30rem] bg-white border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Só para o cabeçalho da prévia — o corpo já vem pronto do pai. */
function aplicarNoExemplo(texto: string, user: Profile | null) {
  if (!user) return texto;
  return texto
    .replace(/\{\{\s*nome\s*\}\}/gi, user.full_name?.trim() || '')
    .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, primeiroNome(user.full_name))
    .replace(/\{\{\s*email\s*\}\}/gi, user.email)
    .replace(/\{\{\s*cidade\s*\}\}/gi, user.city || '')
    .replace(/\{\{\s*estado\s*\}\}/gi, user.state || '');
}
