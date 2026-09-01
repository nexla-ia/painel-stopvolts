import { useEffect, useMemo, useState, FormEvent } from 'react';
import { supabase, EnergyTariff } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Search, ChevronRight, Zap, MapPin, TrendingUp, Flag } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Panel from '../components/ui/Panel';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import SplitView from '../components/ui/SplitView';
import Spinner from '../components/ui/Spinner';
import {
  inputClass,
  inputClassReadOnly,
  labelClass,
  selectClass,
  splitItemClass,
} from '../components/ui/classes';

type TariffFlag = 'verde' | 'amarela' | 'vermelha';

const FLAG_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  verde: 'success',
  amarela: 'warning',
  vermelha: 'danger',
};

const EMPTY_FORM = { base_tariff: '', tariff_flag: 'verde' as TariffFlag };

export default function Tariffs() {
  const toast = useToast();
  const [tariffs, setTariffs] = useState<EnergyTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [flagFilter, setFlagFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    loadTariffs();
  }, []);

  const loadTariffs = async () => {
    try {
      const { data, error } = await supabase
        .from('energy_tariffs')
        .select('*')
        .order('state_name', { ascending: true });

      if (error) throw error;
      const loaded = data || [];
      setTariffs(loaded);
      setSelectedId(prev => prev ?? loaded[0]?.id ?? null);
    } catch (error) {
      console.error('Error loading tariffs:', error);
      toast.error('Não foi possível carregar as tarifas.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTariffs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return tariffs.filter(tariff => {
      if (term) {
        const haystack = `${tariff.state} ${tariff.state_name} ${tariff.distributor}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (flagFilter !== 'all' && tariff.tariff_flag !== flagFilter) return false;
      return true;
    });
  }, [tariffs, searchTerm, flagFilter]);

  const selectedTariff = filteredTariffs.find(t => t.id === selectedId) || filteredTariffs[0] || null;

  // Recarrega o formulário sempre que a seleção muda, para não editar a tarifa errada.
  useEffect(() => {
    if (selectedTariff) {
      setFormData({
        base_tariff: selectedTariff.base_tariff.toString(),
        tariff_flag: selectedTariff.tariff_flag as TariffFlag,
      });
    }
  }, [selectedTariff?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTariff) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('energy_tariffs')
        .update({
          base_tariff: parseFloat(formData.base_tariff),
          tariff_flag: formData.tariff_flag,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTariff.id);

      if (error) throw error;

      toast.success(`Tarifa de ${selectedTariff.state_name} atualizada.`);
      await loadTariffs();
    } catch (error) {
      console.error('Error saving tariff:', error);
      toast.error('Erro ao salvar tarifa.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-72 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const flagCounts = {
    verde: tariffs.filter(t => t.tariff_flag === 'verde').length,
    amarela: tariffs.filter(t => t.tariff_flag === 'amarela').length,
    vermelha: tariffs.filter(t => t.tariff_flag === 'vermelha').length,
  };
  const avgTariff =
    tariffs.length > 0 ? tariffs.reduce((sum, t) => sum + Number(t.base_tariff), 0) / tariffs.length : 0;

  const isDirty =
    selectedTariff !== null &&
    (formData.base_tariff !== selectedTariff.base_tariff.toString() ||
      formData.tariff_flag !== selectedTariff.tariff_flag);

  return (
    <div className="flex flex-col gap-6 desk:h-full desk:min-h-0">
      <PageHeader
        eyebrow="Tarifação"
        title="Tarifas de Energia"
        subtitle="Gerenciar tarifas por estado e distribuidora"
        actions={
          <span className="bg-volt text-volt-ink px-4 py-2 rounded-md font-display font-bold text-lg leading-none shadow-lg shadow-volt/20">
            {tariffs.length}
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} icon={MapPin} accent="volt" label="Estados Cadastrados" value={tariffs.length} />
        <StatCard
          index={1}
          icon={TrendingUp}
          accent="info"
          label="Tarifa Média"
          value={`R$ ${avgTariff.toFixed(4)}`}
          sublabel="Por kWh"
        />
        <StatCard index={2} icon={Flag} accent="success" label="Bandeira Verde" value={flagCounts.verde} />
        <StatCard
          index={3}
          icon={Flag}
          accent="danger"
          label="Bandeira Vermelha"
          value={flagCounts.vermelha}
          sublabel={`${flagCounts.amarela} em bandeira amarela`}
        />
      </div>

      <Panel className="p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
          <input
            type="text"
            placeholder="Buscar por estado, nome ou distribuidora..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={flagFilter} onChange={e => setFlagFilter(e.target.value)} className={selectClass}>
            <option value="all">Todas as Bandeiras</option>
            <option value="verde">Verde</option>
            <option value="amarela">Amarela</option>
            <option value="vermelha">Vermelha</option>
          </select>
        </div>

        <div className="text-sm text-muted">
          Mostrando {filteredTariffs.length} de {tariffs.length} tarifas
        </div>
      </Panel>

      {filteredTariffs.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Search}
            title="Nenhuma tarifa encontrada"
            description="Tente ajustar seus critérios de busca ou filtro."
          />
        </Panel>
      ) : (
        <div className="desk:flex-1 desk:min-h-0">
          <SplitView
            listLabel={`${filteredTariffs.length} estados`}
            list={filteredTariffs.map(tariff => {
              const isSelected = selectedTariff?.id === tariff.id;
              return (
                <button
                  key={tariff.id}
                  onClick={() => setSelectedId(tariff.id)}
                  className={splitItemClass(isSelected, tariff.tariff_flag === 'vermelha')}
                >
                  <div className="shrink-0 h-9 w-9 bg-volt-soft rounded-md flex items-center justify-center">
                    <span className="text-volt font-bold text-xs">{tariff.state}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{tariff.state_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-muted">R$ {tariff.base_tariff.toFixed(4)}</span>
                      <Badge variant={FLAG_VARIANT[tariff.tariff_flag] || 'neutral'} className="capitalize">
                        {tariff.tariff_flag}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-volt' : 'text-faint'}`}
                  />
                </button>
              );
            })}
            detail={
              selectedTariff && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 h-14 w-14 bg-volt-soft rounded-md flex items-center justify-center">
                      <span className="text-volt font-bold text-xl">{selectedTariff.state}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display font-bold text-xl text-fg truncate">
                        {selectedTariff.state_name}
                      </h2>
                      <p className="text-sm text-faint truncate">{selectedTariff.distributor}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <Badge
                          variant={FLAG_VARIANT[selectedTariff.tariff_flag] || 'neutral'}
                          className="capitalize"
                        >
                          {selectedTariff.tariff_flag}
                        </Badge>
                        <Badge variant={selectedTariff.is_active ? 'success' : 'neutral'}>
                          {selectedTariff.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="border border-edge rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-muted" />
                      <h3 className="font-display font-bold text-sm text-fg uppercase tracking-wide">
                        Editar Tarifa
                      </h3>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Estado (Sigla)</label>
                          <input
                            type="text"
                            value={selectedTariff.state}
                            readOnly
                            className={`${inputClassReadOnly} uppercase`}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Distribuidora</label>
                          <input
                            type="text"
                            value={selectedTariff.distributor}
                            readOnly
                            className={inputClassReadOnly}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Tarifa Base (R$/kWh)</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={formData.base_tariff}
                            onChange={e => setFormData({ ...formData, base_tariff: e.target.value })}
                            required
                            className={`${inputClass} font-mono`}
                            placeholder="0.7856"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Bandeira Tarifária</label>
                          <select
                            value={formData.tariff_flag}
                            onChange={e =>
                              setFormData({ ...formData, tariff_flag: e.target.value as TariffFlag })
                            }
                            required
                            className={selectClass}
                          >
                            <option value="verde">Verde</option>
                            <option value="amarela">Amarela</option>
                            <option value="vermelha">Vermelha</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={saving || !isDirty}
                          className="px-5 py-2.5 bg-volt text-volt-ink rounded-md font-semibold hover:bg-volt-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {saving ? (
                            <>
                              <Spinner className="w-4 h-4" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar Alterações'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="border border-edge rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Flag className="w-4 h-4 text-muted" />
                      <h3 className="font-display font-bold text-sm text-fg uppercase tracking-wide">
                        Vigência
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-faint mb-0.5">Válida desde</p>
                        <p className="text-sm font-medium text-fg">
                          {new Date(selectedTariff.valid_from).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-faint mb-0.5">Válida até</p>
                        <p className="text-sm font-medium text-fg">
                          {selectedTariff.valid_until
                            ? new Date(selectedTariff.valid_until).toLocaleDateString('pt-BR')
                            : 'Sem prazo'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-faint mb-0.5">
                          Adicional de bandeira
                        </p>
                        <p className="text-sm font-medium text-fg font-mono">
                          R$ {Number(selectedTariff.flag_value).toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-faint mb-0.5">
                          Atualizada em
                        </p>
                        <p className="text-sm font-medium text-fg">
                          {new Date(selectedTariff.updated_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          />
        </div>
      )}
    </div>
  );
}
