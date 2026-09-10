import { LinhaCoorte } from '../../lib/funnel';
import EmptyState from '../ui/EmptyState';
import { Repeat } from 'lucide-react';

interface CohortTableProps {
  coortes: LinhaCoorte[];
}

const MARCOS = [30, 60, 90] as const;

/** Verde acima de 70%, âmbar entre 40–69%, vermelho abaixo — mesma leitura rápida do resto do painel. */
function corDaTaxa(taxa: number) {
  if (taxa >= 70) return 'text-brand';
  if (taxa >= 40) return 'text-warning';
  return 'text-danger';
}

/**
 * Uma linha por mês de cadastro, uma coluna por marco de retenção. Célula
 * vazia ("—") quando a coorte ainda não chegou naquele marco — não é 0%,
 * é "ainda não dá pra saber".
 */
export default function CohortTable({ coortes }: CohortTableProps) {
  if (coortes.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Nenhum cadastro no período"
        description="As coortes de retenção aparecem aqui assim que houver cadastros no intervalo selecionado."
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-edge">
              <th className="text-left font-semibold text-faint text-[11px] uppercase tracking-wider py-2 pr-3">
                Coorte
              </th>
              <th className="text-right font-semibold text-faint text-[11px] uppercase tracking-wider py-2 px-3">
                Cadastros
              </th>
              {MARCOS.map(dias => (
                <th
                  key={dias}
                  className="text-right font-semibold text-faint text-[11px] uppercase tracking-wider py-2 pl-3"
                >
                  {dias} dias
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coortes.map(coorte => (
              <tr key={coorte.mes} className="border-b border-edge/60 last:border-0">
                <td className="py-2.5 pr-3 text-fg capitalize whitespace-nowrap">{coorte.rotuloMes}</td>
                <td className="py-2.5 px-3 text-right text-muted font-tabular">{coorte.tamanho}</td>
                {MARCOS.map(dias => {
                  const taxa = coorte.retencao[dias];
                  return (
                    <td key={dias} className="py-2.5 pl-3 text-right font-tabular">
                      {taxa === null ? (
                        <span className="text-faint">—</span>
                      ) : (
                        <span className={`font-semibold ${corDaTaxa(taxa)}`}>{taxa}%</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-faint mt-2 sm:hidden">Role para o lado para ver todos os marcos</p>
    </div>
  );
}
