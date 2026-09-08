import { ReactNode, useMemo, useState } from 'react';
import {
  UserRow,
  SubscriptionPlan,
  planLabel,
  isPaidPlan,
  deviceCountOf,
  isOverLimit,
  isAtLimit,
} from '../lib/supabase';
import { ArrowDown, ArrowUp, ChevronsUpDown, ChevronRight, Crown, AlertTriangle } from 'lucide-react';
import Panel from './ui/Panel';
import Badge from './ui/Badge';

interface ColunaTabela {
  chave: string;
  titulo: string;
  /** Alinha o conteúdo à direita — usado nas colunas numéricas. */
  numerica?: boolean;
  /**
   * Valor usado na ordenação. Ausente quando a coluna não faz sentido ordenar
   * (a do indicador de abrir, por exemplo), e aí o cabeçalho não vira botão.
   */
  ordenar?: (user: UserRow) => number | string;
  celula: (user: UserRow) => ReactNode;
  /** Largura fixa; a soma delas define a largura mínima da tabela. */
  largura: string;
}

interface UsersTableProps {
  users: UserRow[];
  plans: Record<string, SubscriptionPlan>;
  selectedUserId: string | null;
  /** Chamado ao clicar numa linha — abre a ficha completa do usuário. */
  onSelect: (userId: string) => void;
}

type Direcao = 'asc' | 'desc';

/** Timestamp de um campo de data; os vazios viram 0 e caem para o fim. */
const instante = (valor: string | null) => (valor ? new Date(valor).getTime() : 0);

const formatarDataHora = (valor: string) =>
  new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatarData = (valor: string) => new Date(valor).toLocaleDateString('pt-BR');

/** Traço no lugar de célula vazia: deixa claro que o dado não existe. */
const vazio = <span className="text-faint">—</span>;

export default function UsersTable({ users, plans, selectedUserId, onSelect }: UsersTableProps) {
  /* Sem ordenação própria a tabela respeita a ordem que a página já montou
     (contas estouradas no topo, depois o critério do seletor de ordenação).
     Ao clicar num cabeçalho, a coluna assume o comando. */
  const [ordem, setOrdem] = useState<{ chave: string; direcao: Direcao } | null>(null);

  const colunas = useMemo<ColunaTabela[]>(
    () => [
      {
        chave: 'usuario',
        titulo: 'Usuário',
        largura: 'w-[280px]',
        ordenar: u => (u.full_name || u.email).toLowerCase(),
        celula: u => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 h-8 w-8 bg-volt-soft rounded-full flex items-center justify-center">
              <span className="text-volt font-semibold text-xs">
                {(u.full_name || u.email)[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-fg truncate">{u.full_name || 'Sem nome'}</p>
              <p className="text-xs text-faint truncate">{u.email}</p>
            </div>
          </div>
        ),
      },
      {
        chave: 'telefone',
        titulo: 'Telefone',
        largura: 'w-[150px]',
        ordenar: u => u.phone || '',
        celula: u => (u.phone ? <span className="font-tabular">{u.phone}</span> : vazio),
      },
      {
        chave: 'local',
        titulo: 'Cidade / UF',
        largura: 'w-[170px]',
        ordenar: u => `${u.state || 'ZZ'} ${u.city || ''}`.toLowerCase(),
        celula: u =>
          u.city || u.state ? (
            <span className="block truncate">
              {u.city || 'Sem cidade'}
              {u.state && <span className="text-faint"> · {u.state}</span>}
            </span>
          ) : (
            vazio
          ),
      },
      {
        chave: 'plano',
        titulo: 'Plano',
        largura: 'w-[150px]',
        ordenar: u => planLabel(u.plan, plans).toLowerCase(),
        celula: u => (
          <Badge
            variant={isPaidPlan(u.plan) ? 'warning' : 'info'}
            icon={isPaidPlan(u.plan) ? <Crown className="w-3 h-3" /> : undefined}
          >
            {planLabel(u.plan, plans)}
          </Badge>
        ),
      },
      {
        chave: 'dispositivos',
        titulo: 'Dispositivos',
        largura: 'w-[130px]',
        numerica: true,
        ordenar: u => deviceCountOf(u),
        celula: u => (
          <Badge
            variant={isOverLimit(u) ? 'danger' : isAtLimit(u) ? 'warning' : 'neutral'}
            icon={isOverLimit(u) ? <AlertTriangle className="w-3 h-3" /> : undefined}
            className="font-tabular"
          >
            {deviceCountOf(u)}/{u.device_limit}
          </Badge>
        ),
      },
      {
        chave: 'consumo',
        titulo: 'Consumo',
        largura: 'w-[120px]',
        numerica: true,
        /* Sem linha na view o dado é desconhecido, não zero — o -1 mantém
           essas contas separadas de quem realmente consome 0 kWh. */
        ordenar: u => u.stats?.estimated_monthly_kwh ?? -1,
        celula: u =>
          u.stats ? (
            <span className="font-tabular">
              {(u.stats.estimated_monthly_kwh ?? 0).toFixed(1)}
              <span className="text-faint text-xs"> kWh</span>
            </span>
          ) : (
            vazio
          ),
      },
      {
        chave: 'custo',
        titulo: 'Custo/mês',
        largura: 'w-[130px]',
        numerica: true,
        ordenar: u => u.stats?.estimated_monthly_cost ?? -1,
        celula: u =>
          u.stats ? (
            <span className="font-tabular">
              {(u.stats.estimated_monthly_cost ?? 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          ) : (
            vazio
          ),
      },
      {
        chave: 'ultimoLogin',
        titulo: 'Último login',
        largura: 'w-[160px]',
        ordenar: u => instante(u.last_login_at),
        celula: u =>
          u.last_login_at ? (
            <span className="font-tabular text-xs">{formatarDataHora(u.last_login_at)}</span>
          ) : (
            <span className="text-xs text-warning">Nunca entrou</span>
          ),
      },
      {
        chave: 'logins',
        titulo: 'Logins',
        largura: 'w-[90px]',
        numerica: true,
        ordenar: u => u.login_count ?? 0,
        celula: u => <span className="font-tabular">{u.login_count ?? 0}</span>,
      },
      {
        chave: 'cadastro',
        titulo: 'Cadastro',
        largura: 'w-[120px]',
        ordenar: u => instante(u.created_at),
        celula: u => <span className="font-tabular text-xs">{formatarData(u.created_at)}</span>,
      },
      {
        chave: 'promo',
        titulo: 'Código promo',
        largura: 'w-[140px]',
        ordenar: u => u.promo_code_used || '',
        celula: u =>
          u.promo_code_used ? <span className="font-mono text-xs">{u.promo_code_used}</span> : vazio,
      },
      {
        chave: 'situacao',
        titulo: 'Situação',
        largura: 'w-[130px]',
        ordenar: u => (u.is_active ? 0 : 1),
        celula: u => (
          <Badge variant={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Ativa' : 'Inativa'}</Badge>
        ),
      },
      {
        chave: 'abrir',
        titulo: '',
        largura: 'w-[56px]',
        celula: u => (
          <ChevronRight
            className={`w-4 h-4 mx-auto transition-colors ${
              selectedUserId === u.id ? 'text-volt' : 'text-faint'
            }`}
          />
        ),
      },
    ],
    [plans, selectedUserId],
  );

  const ordenados = useMemo(() => {
    if (!ordem) return users;
    const coluna = colunas.find(c => c.chave === ordem.chave);
    const extrair = coluna?.ordenar;
    if (!extrair) return users;

    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    return [...users].sort((a, b) => {
      const valorA = extrair(a);
      const valorB = extrair(b);
      if (typeof valorA === 'number' && typeof valorB === 'number') return (valorA - valorB) * sinal;
      return String(valorA).localeCompare(String(valorB), 'pt-BR') * sinal;
    });
  }, [users, ordem, colunas]);

  const alternarOrdem = (chave: string) => {
    setOrdem(atual => {
      if (atual?.chave !== chave) return { chave, direcao: 'asc' };
      if (atual.direcao === 'asc') return { chave, direcao: 'desc' };
      /* Terceiro clique devolve o controle para a ordenação da página. */
      return null;
    });
  };

  return (
    /*
      Painel de altura travada só onde há altura sobrando (`desk`); abaixo
      disso ele cresce e quem rola é a página, como no resto do painel.
    */
    <Panel className="overflow-hidden flex flex-col min-h-[24rem] max-h-[75vh] desk:min-h-0 desk:max-h-none desk:h-full">
      <div className="flex-1 min-h-0 overflow-auto overscroll-contain">
        {/*
          `border-separate` em vez de `border-collapse`: com bordas colapsadas
          o navegador desenha a borda no nível da tabela, e ela some por baixo
          do cabeçalho fixo ao rolar. Separadas, cada célula carrega a própria
          borda e o cabeçalho continua fechado.

          `table-fixed` faz as larguras declaradas valerem — sem isso o
          navegador redistribui tudo pelo tamanho do conteúdo e as colunas
          dançam conforme o filtro.
        */}
        <table className="w-full min-w-[1826px] table-fixed border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              {colunas.map((coluna, indice) => {
                const ativa = ordem?.chave === coluna.chave;
                const Icone = !ativa ? ChevronsUpDown : ordem.direcao === 'asc' ? ArrowUp : ArrowDown;

                return (
                  <th
                    key={coluna.chave}
                    scope="col"
                    aria-sort={ativa ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`${coluna.largura} bg-elevated border-b border-edge-strong px-4 py-2.5 text-left align-middle ${
                      /* A primeira coluna gruda na esquerda ao rolar na
                         horizontal; no cabeçalho ela precisa de z maior para
                         passar por cima das células fixas do corpo. */
                      indice === 0 ? 'sticky left-0 z-30 border-r border-r-edge' : ''
                    }`}
                  >
                    {coluna.ordenar ? (
                      <button
                        type="button"
                        onClick={() => alternarOrdem(coluna.chave)}
                        title={`Ordenar por ${coluna.titulo}`}
                        className={`flex items-center gap-1.5 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/50 ${
                          coluna.numerica ? 'ml-auto flex-row-reverse' : ''
                        } ${ativa ? 'text-volt' : 'text-faint hover:text-fg'}`}
                      >
                        {coluna.titulo}
                        <Icone className={`w-3 h-3 shrink-0 ${ativa ? '' : 'opacity-40'}`} />
                      </button>
                    ) : (
                      <span className="sr-only">Abrir ficha</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {ordenados.map(user => {
              const selecionado = selectedUserId === user.id;
              const estourou = isOverLimit(user);

              /*
                A célula fixa não herda o fundo da linha, e os tons do painel
                são translúcidos (12% de opacidade) — pintar a célula só com
                eles deixaria o conteúdo das outras colunas passar por baixo ao
                rolar. Então ela recebe `bg-panel` opaco e o tom entra como
                gradiente chapado por cima, que é imagem de fundo e cobre.
              */
              const tom = selecionado
                ? 'from-volt-soft to-volt-soft'
                : estourou
                  ? 'from-danger-soft to-danger-soft'
                  : 'from-transparent to-transparent';
              const fundoLinha = selecionado ? 'bg-volt-soft' : estourou ? 'bg-danger-soft' : '';

              return (
                <tr
                  key={user.id}
                  onClick={() => onSelect(user.id)}
                  className={`group cursor-pointer transition-colors ${fundoLinha} hover:bg-edge/30`}
                >
                  {colunas.map((coluna, indice) => (
                    <td
                      key={coluna.chave}
                      className={`${coluna.largura} border-b border-edge/60 px-4 py-2.5 align-middle text-fg ${
                        coluna.numerica ? 'text-right' : ''
                      } ${
                        indice === 0
                          ? `sticky left-0 z-10 border-r border-r-edge bg-panel bg-gradient-to-r ${tom} group-hover:from-edge/30 group-hover:to-edge/30`
                          : ''
                      }`}
                    >
                      {indice === 0 ? (
                        /* A linha inteira é clicável, mas o botão dá o alvo de
                           teclado: dá para tabular pela tabela e abrir a ficha
                           com Enter. */
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            onSelect(user.id);
                          }}
                          className="w-full rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/50"
                        >
                          {coluna.celula(user)}
                        </button>
                      ) : (
                        coluna.celula(user)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 flex items-center justify-between gap-3 border-t border-edge px-4 py-2">
        <p className="text-[11px] text-faint">
          {ordenados.length} {ordenados.length === 1 ? 'linha' : 'linhas'} · clique numa linha para abrir a
          ficha completa · role para o lado para ver todas as colunas
        </p>
        {ordem && (
          <button
            type="button"
            onClick={() => setOrdem(null)}
            className="shrink-0 text-[11px] font-semibold text-volt hover:underline"
          >
            Limpar ordenação
          </button>
        )}
      </div>
    </Panel>
  );
}
