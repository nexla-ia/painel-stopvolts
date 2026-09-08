/**
 * Gerador de arquivo .xlsx sem dependência externa.
 *
 * Um .xlsx é um ZIP com alguns XMLs dentro. Aqui o ZIP é gravado sem
 * compressão (método "store"), o que dispensa uma biblioteca de deflate e
 * mantém o arquivo válido — uma planilha de algumas centenas de linhas fica na
 * casa das dezenas de KB.
 *
 * Por que não CSV: acento quebra conforme a configuração do Excel, o separador
 * de colunas muda de máquina para máquina e todo número chega como texto.
 * Gerando o xlsx de verdade, número é número, data é data, e a planilha abre
 * com dois cliques sem passar pelo assistente de importação.
 */

export type TipoColuna = 'texto' | 'inteiro' | 'decimal' | 'moeda' | 'data' | 'dataHora';

export type ValorCelula = string | number | Date | null | undefined;

export interface ColunaPlanilha<T> {
  cabecalho: string;
  /** Largura da coluna em caracteres. Padrão: 18. */
  largura?: number;
  /** Define o formato do número no Excel. Padrão: 'texto'. */
  tipo?: TipoColuna;
  valor: (item: T) => ValorCelula;
}

export interface OpcoesPlanilha<T> {
  /** Nome da aba. O Excel limita a 31 caracteres e proíbe : \ / ? * [ ] */
  nomePlanilha?: string;
  colunas: ColunaPlanilha<T>[];
  linhas: T[];
}

/* ------------------------------------------------------------------ *
 * ZIP
 * ------------------------------------------------------------------ */

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[i] = c >>> 0;
  }
  return tabela;
})();

function crc32(dados: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < dados.length; i++) c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* Data fixa 1980-01-01 no formato DOS: o carimbo de hora não é usado por
   ninguém aqui e uma data fixa deixa o arquivo reproduzível. */
const DATA_DOS = 33;
/* Bit 11 ligado avisa que os nomes de arquivo estão em UTF-8. */
const SINALIZADORES = 0x0800;

interface ArquivoZip {
  nome: string;
  dados: Uint8Array;
}

function zipar(arquivos: ArquivoZip[]): Blob {
  const codificador = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let deslocamento = 0;

  for (const arquivo of arquivos) {
    const nome = codificador.encode(arquivo.nome);
    const crc = crc32(arquivo.dados);
    const tamanho = arquivo.dados.length;

    const local = new Uint8Array(30 + nome.length);
    const visaoLocal = new DataView(local.buffer);
    visaoLocal.setUint32(0, 0x04034b50, true);
    visaoLocal.setUint16(4, 20, true); // versão necessária
    visaoLocal.setUint16(6, SINALIZADORES, true);
    visaoLocal.setUint16(8, 0, true); // método: sem compressão
    visaoLocal.setUint16(10, 0, true); // hora
    visaoLocal.setUint16(12, DATA_DOS, true);
    visaoLocal.setUint32(14, crc, true);
    visaoLocal.setUint32(18, tamanho, true); // tamanho comprimido
    visaoLocal.setUint32(22, tamanho, true); // tamanho original
    visaoLocal.setUint16(26, nome.length, true);
    visaoLocal.setUint16(28, 0, true); // sem campo extra
    local.set(nome, 30);

    const entrada = new Uint8Array(46 + nome.length);
    const visaoEntrada = new DataView(entrada.buffer);
    visaoEntrada.setUint32(0, 0x02014b50, true);
    visaoEntrada.setUint16(4, 20, true); // versão de origem
    visaoEntrada.setUint16(6, 20, true); // versão necessária
    visaoEntrada.setUint16(8, SINALIZADORES, true);
    visaoEntrada.setUint16(10, 0, true);
    visaoEntrada.setUint16(12, 0, true);
    visaoEntrada.setUint16(14, DATA_DOS, true);
    visaoEntrada.setUint32(16, crc, true);
    visaoEntrada.setUint32(20, tamanho, true);
    visaoEntrada.setUint32(24, tamanho, true);
    visaoEntrada.setUint16(28, nome.length, true);
    visaoEntrada.setUint32(42, deslocamento, true); // onde começa o cabeçalho local
    entrada.set(nome, 46);

    partes.push(local, arquivo.dados);
    central.push(entrada);
    deslocamento += local.length + tamanho;
  }

  const tamanhoCentral = central.reduce((soma, parte) => soma + parte.length, 0);

  const fim = new Uint8Array(22);
  const visaoFim = new DataView(fim.buffer);
  visaoFim.setUint32(0, 0x06054b50, true);
  visaoFim.setUint16(8, arquivos.length, true);
  visaoFim.setUint16(10, arquivos.length, true);
  visaoFim.setUint32(12, tamanhoCentral, true);
  visaoFim.setUint32(16, deslocamento, true);

  return new Blob([...partes, ...central, fim], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/* ------------------------------------------------------------------ *
 * XML
 * ------------------------------------------------------------------ */

function escaparXml(texto: string) {
  let saida = '';
  for (const caractere of texto) {
    const codigo = caractere.codePointAt(0) ?? 0;
    /* Caracteres de controle são inválidos em XML e não têm o que fazer numa
       planilha — vindos de um campo sujo, corromperiam o arquivo inteiro. */
    if (codigo < 0x20 && codigo !== 0x09 && codigo !== 0x0a && codigo !== 0x0d) continue;

    if (caractere === '&') saida += '&amp;';
    else if (caractere === '<') saida += '&lt;';
    else if (caractere === '>') saida += '&gt;';
    else if (caractere === '"') saida += '&quot;';
    else saida += caractere;
  }
  return saida;
}

function letraColuna(indice: number) {
  let letra = '';
  let n = indice;
  while (n >= 0) {
    letra = String.fromCharCode(65 + (n % 26)) + letra;
    n = Math.floor(n / 26) - 1;
  }
  return letra;
}

/**
 * Converte para o número de série de data do Excel.
 *
 * A origem é 1899-12-30 (e não 1900-01-01) porque o Excel trata 1900 como
 * bissexto por compatibilidade com o Lotus 1-2-3. Os componentes são lidos em
 * hora local e remontados em UTC para a data não escorregar um dia conforme o
 * fuso de quem exporta.
 */
function serieData(data: Date) {
  const local = Date.UTC(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    data.getHours(),
    data.getMinutes(),
    data.getSeconds(),
  );
  return (local - Date.UTC(1899, 11, 30)) / 86400000;
}

/* Índices dentro de <cellXfs> do styles.xml abaixo. */
const ESTILO_PADRAO = 0;
const ESTILO_CABECALHO = 1;
const ESTILO_POR_TIPO: Record<TipoColuna, number> = {
  texto: ESTILO_PADRAO,
  inteiro: 2,
  decimal: 3,
  moeda: 4,
  data: 5,
  dataHora: 6,
};

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const RELS_RAIZ = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const RELS_PASTA = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

/* Cabeçalho escuro com texto branco, na linha do painel. Os dois primeiros
   preenchimentos (none e gray125) são exigidos pelo Excel nessa ordem. */
const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="5">
<numFmt numFmtId="164" formatCode="0"/>
<numFmt numFmtId="165" formatCode="0.00"/>
<numFmt numFmtId="166" formatCode="&quot;R$&quot;\\ #,##0.00"/>
<numFmt numFmtId="167" formatCode="dd/mm/yyyy"/>
<numFmt numFmtId="168" formatCode="dd/mm/yyyy\\ hh:mm"/>
</numFmts>
<fonts count="2">
<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF111827"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Nome de aba aceito pelo Excel: até 31 caracteres, sem : \ / ? * [ ] */
function limparNomeAba(nome: string) {
  const limpo = nome.replace(/[:\\/?*[\]]/g, ' ').trim();
  return (limpo || 'Planilha1').slice(0, 31);
}

function celula(referencia: string, valor: ValorCelula, tipo: TipoColuna) {
  if (valor === null || valor === undefined || valor === '') return '';

  if (tipo === 'data' || tipo === 'dataHora') {
    const data = valor instanceof Date ? valor : new Date(String(valor));
    if (Number.isNaN(data.getTime())) return '';
    return `<c r="${referencia}" s="${ESTILO_POR_TIPO[tipo]}"><v>${serieData(data)}</v></c>`;
  }

  if (tipo === 'inteiro' || tipo === 'decimal' || tipo === 'moeda') {
    const numero = typeof valor === 'number' ? valor : Number(valor);
    if (!Number.isFinite(numero)) return '';
    return `<c r="${referencia}" s="${ESTILO_POR_TIPO[tipo]}"><v>${numero}</v></c>`;
  }

  const texto = valor instanceof Date ? valor.toLocaleString('pt-BR') : String(valor);
  return `<c r="${referencia}" s="${ESTILO_PADRAO}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(texto)}</t></is></c>`;
}

function montarAba<T>(colunas: ColunaPlanilha<T>[], linhas: T[]) {
  const ultimaColuna = letraColuna(colunas.length - 1);
  const ultimaLinha = linhas.length + 1;

  const larguras = colunas
    .map((coluna, i) => `<col min="${i + 1}" max="${i + 1}" width="${coluna.largura ?? 18}" customWidth="1"/>`)
    .join('');

  const cabecalho = colunas
    .map(
      (coluna, i) =>
        `<c r="${letraColuna(i)}1" s="${ESTILO_CABECALHO}" t="inlineStr"><is><t>${escaparXml(coluna.cabecalho)}</t></is></c>`,
    )
    .join('');

  const corpo = linhas
    .map((item, indice) => {
      const numeroLinha = indice + 2;
      const celulas = colunas
        .map((coluna, i) =>
          celula(`${letraColuna(i)}${numeroLinha}`, coluna.valor(item), coluna.tipo ?? 'texto'),
        )
        .join('');
      return `<row r="${numeroLinha}">${celulas}</row>`;
    })
    .join('');

  /* A ordem dos elementos dentro de <worksheet> é fixa no formato: o
     autoFilter vem depois do sheetData, não antes. */
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${ultimaColuna}${ultimaLinha}"/>
<sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${larguras}</cols>
<sheetData><row r="1" ht="24" customHeight="1">${cabecalho}</row>${corpo}</sheetData>
<autoFilter ref="A1:${ultimaColuna}${ultimaLinha}"/>
</worksheet>`;
}

/** Monta o arquivo .xlsx em memória. */
export function gerarXlsx<T>({ nomePlanilha = 'Planilha1', colunas, linhas }: OpcoesPlanilha<T>): Blob {
  const aba = limparNomeAba(nomePlanilha);
  const codificador = new TextEncoder();

  const livro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escaparXml(aba)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  return zipar([
    { nome: '[Content_Types].xml', dados: codificador.encode(CONTENT_TYPES) },
    { nome: '_rels/.rels', dados: codificador.encode(RELS_RAIZ) },
    { nome: 'xl/workbook.xml', dados: codificador.encode(livro) },
    { nome: 'xl/_rels/workbook.xml.rels', dados: codificador.encode(RELS_PASTA) },
    { nome: 'xl/styles.xml', dados: codificador.encode(ESTILOS) },
    { nome: 'xl/worksheets/sheet1.xml', dados: codificador.encode(montarAba(colunas, linhas)) },
  ]);
}

/** Dispara o download de um blob com o nome informado. */
export function baixarArquivo(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  /* O Firefox cancela o download se o objeto sai da memória cedo demais. */
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Gera a planilha e já entrega o download ao navegador. */
export function baixarXlsx<T>(opcoes: OpcoesPlanilha<T> & { nomeArquivo: string }) {
  const { nomeArquivo, ...resto } = opcoes;
  baixarArquivo(gerarXlsx(resto), nomeArquivo);
}

/** Sufixo de data para o nome do arquivo, ex: `2026-09-08`. */
export function carimboDeData(data = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}
