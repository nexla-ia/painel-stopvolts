import { CSSProperties, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CORES_EMAIL } from '../../lib/email';

interface RichTextAreaProps {
  value: string;
  onChange: (v: string) => void;
  className: string;
  style: CSSProperties;
  placeholder: string;
  ariaLabel: string;
  /** Aplica o negrito de `*palavra*` na camada de baixo. */
  destacar?: boolean;
}

/** O que a barra de ferramentas precisa para mexer no campo. */
export interface RichTextAreaHandle {
  /** Insere o texto na posição do cursor. */
  inserir: (texto: string) => void;
  /** Envolve o trecho selecionado, ou abre um par vazio se não houver seleção. */
  envolver: (marcador: string) => void;
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Pinta o texto da camada de fundo.
 *
 * Os asteriscos continuam desenhados, só que apagados: se sumissem, a camada
 * de baixo teria menos caracteres que o textarea de cima e o alinhamento entre
 * as duas quebraria no meio da linha.
 */
function pintar(texto: string) {
  const comNegrito = escapar(texto).replace(
    /(?<![\w*])\*([^*\n]+)\*(?![\w*])/g,
    (_m, miolo) =>
      `<span style="opacity:.28">*</span><b style="font-weight:600;color:${CORES_EMAIL.titulo}">${miolo}</b><span style="opacity:.28">*</span>`,
  );

  // As variáveis ganham um fundo leve para se destacarem do texto corrido.
  const comVariaveis = comNegrito.replace(
    /\{\{\s*[a-z_]+\s*\}\}/gi,
    m => `<span style="background:#E8EDF5;border-radius:3px;color:#4B5B72">${m}</span>`,
  );

  // A última linha vazia some sem um caractere invisível para segurá-la.
  return comVariaveis.replace(/\n$/, '\n​');
}

/**
 * Campo de texto que mostra a formatação enquanto se escreve.
 *
 * O textarea fica transparente por cima de uma camada que desenha o texto já
 * formatado. Assim o negrito aparece na hora, e cursor, seleção, atalhos e
 * corretor continuam sendo os nativos do navegador — o que um `contentEditable`
 * costuma estragar.
 */
const RichTextArea = forwardRef<RichTextAreaHandle, RichTextAreaProps>(function RichTextArea(
  { value, onChange, className, style, placeholder, ariaLabel, destacar = false },
  ref,
) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fundoRef = useRef<HTMLDivElement>(null);

  /** Devolve o foco e reposiciona o cursor depois que o React repinta o valor. */
  const reposicionar = (inicio: number, fim: number) => {
    requestAnimationFrame(() => {
      const area = areaRef.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(inicio, fim);
    });
  };

  useImperativeHandle(ref, () => ({
    inserir: texto => {
      const area = areaRef.current;
      const pos = area ? area.selectionStart : value.length;
      const fim = area ? area.selectionEnd : value.length;
      onChange(value.slice(0, pos) + texto + value.slice(fim));
      reposicionar(pos + texto.length, pos + texto.length);
    },
    envolver: marcador => {
      const area = areaRef.current;
      const inicio = area ? area.selectionStart : value.length;
      const fim = area ? area.selectionEnd : value.length;
      const selecionado = value.slice(inicio, fim);

      // Já marcado: tira os marcadores em vez de empilhar outro par.
      if (
        selecionado.startsWith(marcador) &&
        selecionado.endsWith(marcador) &&
        selecionado.length > marcador.length * 2
      ) {
        const limpo = selecionado.slice(marcador.length, -marcador.length);
        onChange(value.slice(0, inicio) + limpo + value.slice(fim));
        reposicionar(inicio, inicio + limpo.length);
        return;
      }

      const marcado = marcador + selecionado + marcador;
      onChange(value.slice(0, inicio) + marcado + value.slice(fim));
      // Sem seleção, deixa o cursor entre os dois marcadores.
      if (selecionado) reposicionar(inicio, inicio + marcado.length);
      else reposicionar(inicio + marcador.length, inicio + marcador.length);
    },
  }));

  // Cresce com o conteúdo, para o cartão crescer junto em vez de rolar.
  useEffect(() => {
    const area = areaRef.current;
    const fundo = fundoRef.current;
    if (!area) return;
    area.style.height = 'auto';
    const altura = `${area.scrollHeight}px`;
    area.style.height = altura;
    if (fundo) fundo.style.height = altura;
  }, [value]);

  const compartilhado: CSSProperties = {
    ...style,
    margin: 0,
    border: 0,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    font: 'inherit',
  };

  return (
    <div className="relative">
      {destacar && (
        <div
          ref={fundoRef}
          aria-hidden="true"
          className={`absolute inset-0 pointer-events-none rounded ${className}`}
          style={compartilhado}
          dangerouslySetInnerHTML={{ __html: pintar(value) }}
        />
      )}

      <textarea
        ref={areaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={1}
        placeholder={placeholder}
        aria-label={ariaLabel}
        spellCheck
        style={{
          ...compartilhado,
          position: 'relative',
          background: 'transparent',
          resize: 'none',
          overflow: 'hidden',
          // O texto real fica invisível; quem aparece é a camada de baixo.
          color: destacar ? 'transparent' : style.color,
          caretColor: (style.color as string) ?? CORES_EMAIL.titulo,
        }}
        className={`w-full outline-none rounded hover:bg-black/[0.03] focus:bg-black/[0.03]
          focus:ring-2 focus:ring-black/10 transition-colors ${className}`}
      />
    </div>
  );
});

export default RichTextArea;
