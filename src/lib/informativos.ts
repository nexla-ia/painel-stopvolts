import { supabase } from './supabase';
import { MidiaCampanha, ContatoPayload } from './broadcast';
import { TipoMidia } from './whatsapp';

/**
 * Um informativo já enviado, como fica guardado no banco.
 *
 * As fotos entram aqui só pelos metadados — nome, tipo e tamanho. O base64 da
 * imagem chega a pesar megabytes por foto, então ele vai para o n8n no envio
 * mas não é guardado: o histórico serve para saber o que foi mandado e para
 * quem, não para rearmazenar arquivos.
 */
export interface Informativo {
  id: string;
  titulo: string;
  mensagem: string;
  midias: { tipo: TipoMidia; nome_arquivo: string; mime_type: string; tamanho_bytes: number }[];
  total_contatos: number;
  contatos: { nome: string; telefone: string }[];
  status: 'enviado' | 'falhou';
  erro: string | null;
  enviado_por: string | null;
  created_at: string;
}

/** Sinaliza que a tabela ainda não existe, para a tela explicar em vez de quebrar. */
export const TABELA_AUSENTE = 'TABELA_AUSENTE';

function tabelaNaoExiste(error: { code?: string; message?: string }) {
  // 42P01 = undefined_table no Postgres; PGRST205 = tabela fora do schema cache.
  return error.code === '42P01' || error.code === 'PGRST205';
}

export async function listarInformativos(): Promise<
  { ok: true; dados: Informativo[] } | { ok: false; motivo: string }
> {
  const { data, error } = await supabase
    .from('informativos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    if (tabelaNaoExiste(error)) return { ok: false, motivo: TABELA_AUSENTE };
    console.error('Error loading informativos:', error);
    return { ok: false, motivo: error.message };
  }

  return { ok: true, dados: (data as Informativo[]) || [] };
}

export async function salvarInformativo(params: {
  titulo: string;
  mensagem: string;
  midias: MidiaCampanha[];
  contatos: ContatoPayload[];
  status: 'enviado' | 'falhou';
  erro: string | null;
  enviadoPor: string | null;
}): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const { error } = await supabase.from('informativos').insert([
    {
      titulo: params.titulo.trim() || 'Sem título',
      mensagem: params.mensagem.trim(),
      midias: params.midias.map(m => ({
        tipo: m.tipo,
        nome_arquivo: m.nome_arquivo,
        mime_type: m.mime_type,
        tamanho_bytes: m.tamanho_bytes,
      })),
      total_contatos: params.contatos.length,
      contatos: params.contatos.map(c => ({ nome: c.nome, telefone: c.telefone })),
      status: params.status,
      erro: params.erro,
      enviado_por: params.enviadoPor,
    },
  ]);

  if (error) {
    if (tabelaNaoExiste(error)) return { ok: false, motivo: TABELA_AUSENTE };
    console.error('Error saving informativo:', error);
    return { ok: false, motivo: error.message };
  }

  return { ok: true };
}
