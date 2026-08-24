import { Fragment, ReactNode } from 'react';
import { REGEX_LINK } from '../../lib/whatsapp';

/**
 * Renderiza o texto com a mesma formatação que o WhatsApp aplica:
 * *negrito*, _itálico_, ~riscado~, ```monoespaçado``` e links clicáveis.
 *
 * Serve para a prévia mostrar o resultado real. Quem escreve não precisa
 * decorar os símbolos — os botões da barra inserem por ele —, mas precisa
 * enxergar o efeito antes de mandar para os clientes.
 */

const PADROES: { regex: RegExp; envolver: (conteudo: ReactNode, chave: string) => ReactNode }[] = [
  {
    regex: /```([\s\S]+?)```/g,
    envolver: (c, k) => (
      <code key={k} className="font-mono text-[0.92em] bg-edge/50 px-1 py-0.5 rounded">
        {c}
      </code>
    ),
  },
  {
    regex: /(?<![\w*])\*([^*\n]+)\*(?![\w*])/g,
    envolver: (c, k) => (
      <strong key={k} className="font-semibold">
        {c}
      </strong>
    ),
  },
  {
    regex: /(?<![\w_])_([^_\n]+)_(?![\w_])/g,
    envolver: (c, k) => (
      <em key={k} className="italic">
        {c}
      </em>
    ),
  },
  {
    regex: /(?<![\w~])~([^~\n]+)~(?![\w~])/g,
    envolver: (c, k) => (
      <s key={k} className="line-through opacity-80">
        {c}
      </s>
    ),
  },
];

/** Quebra o texto aplicando um padrão de cada vez, recursivamente. */
function aplicar(texto: string, nivel: number, prefixo: string): ReactNode[] {
  if (nivel >= PADROES.length) return linkificar(texto, prefixo);

  const { regex, envolver } = PADROES[nivel];
  const partes: ReactNode[] = [];
  let ultimoIndice = 0;
  let match: RegExpExecArray | null;

  // `regex` é global; zerar o lastIndex evita resultado dependente da chamada
  // anterior, já que o objeto é reaproveitado entre renderizações.
  regex.lastIndex = 0;

  while ((match = regex.exec(texto)) !== null) {
    if (match.index > ultimoIndice) {
      partes.push(
        ...aplicar(texto.slice(ultimoIndice, match.index), nivel + 1, `${prefixo}-${ultimoIndice}`),
      );
    }
    partes.push(
      envolver(aplicar(match[1], nivel + 1, `${prefixo}-i${match.index}`), `${prefixo}-m${match.index}`),
    );
    ultimoIndice = match.index + match[0].length;
  }

  if (ultimoIndice < texto.length) {
    partes.push(...aplicar(texto.slice(ultimoIndice), nivel + 1, `${prefixo}-${ultimoIndice}`));
  }

  return partes;
}

function linkificar(texto: string, prefixo: string): ReactNode[] {
  const partes: ReactNode[] = [];
  let ultimoIndice = 0;
  let match: RegExpExecArray | null;

  REGEX_LINK.lastIndex = 0;

  while ((match = REGEX_LINK.exec(texto)) !== null) {
    if (match.index > ultimoIndice) {
      partes.push(
        <Fragment key={`${prefixo}-t${ultimoIndice}`}>{texto.slice(ultimoIndice, match.index)}</Fragment>,
      );
    }
    partes.push(
      <span key={`${prefixo}-l${match.index}`} className="text-info underline break-all">
        {match[0]}
      </span>,
    );
    ultimoIndice = match.index + match[0].length;
  }

  if (ultimoIndice < texto.length) {
    partes.push(<Fragment key={`${prefixo}-t${ultimoIndice}`}>{texto.slice(ultimoIndice)}</Fragment>);
  }

  return partes;
}

export default function WhatsAppText({ texto, className = '' }: { texto: string; className?: string }) {
  return <p className={`whitespace-pre-wrap break-words ${className}`}>{aplicar(texto, 0, 'r')}</p>;
}
