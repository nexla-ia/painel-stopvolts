import { useEffect, useMemo, useState, FormEvent } from 'react';
import { supabase, EnergyTariff } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Search, Edit2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Panel from '../components/ui/Panel';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { inputClass, inputClassReadOnly, labelClass, selectClass } from '../components/ui/classes';

type TariffFlag = 'verde' | 'amarela' | 'vermelha';

const FLAG_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  verde: 'success',
  amarela: 'warning',
  vermelha: 'danger',
};

export default function Tariffs() {
  const toast = useToast();
  const [tariffs, setTariffs] = useState<EnergyTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [flagFilter, setFlagFilter] = useState<string>('all');
  const [editingTariff, setEditingTariff] = useState<EnergyTariff | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    state: '',
    state_name: '',
    base_tariff: '',
    tariff_flag: 'verde' as TariffFlag,
  });

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
      setTariffs(data || []);
    } catch (error) {
      console.error('Error loading tariffs:', error);
      toast.error('Não foi possível carregar as tarifas.');
    } finally {
      setLoading(false);
    }
  };

  const states = useMemo(() => [...new Set(tariffs.map(t => t.state))].sort(), [tariffs]);

  const filteredTariffs = useMemo(() => {
    return tariffs.filter(tariff => {
      if (
        searchTerm &&
        !tariff.state.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !tariff.state_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !tariff.distributor.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (stateFilter !== 'all' && tariff.state !== stateFilter) return false;
      if (flagFilter !== 'all' && tariff.tariff_flag !== flagFilter) return false;
      return true;
    });
  }, [tariffs, searchTerm, stateFilter, flagFilter]);

  const openModal = (tariff: EnergyTariff) => {
    setEditingTariff(tariff);
    setFormData({
      state: tariff.state,
      state_name: tariff.state_name,
      base_tariff: tariff.base_tariff.toString(),
      tariff_flag: tariff.tariff_flag as TariffFlag,
    });
  };

  const closeModal = () => setEditingTariff(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTariff) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('energy_tariffs')
        .update({
          base_tariff: parseFloat(formData.base_tariff),
          tariff_flag: formData.tariff_flag,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTariff.id);

      if (error) throw error;

      toast.success(`Tarifa de ${editingTariff.state_name} atualizada.`);
      await loadTariffs();
      closeModal();
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
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tarifação" title="Tarifas de Energia" subtitle="Gerenciar tarifas por estado e distribuidora" />

      <Panel className="p-5">
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
          <input
            type="text"
            placeholder="Buscar por estado, nome ou distribuidora..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>

        <div className="flex gap-3">
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className={selectClass}>
            <option value="all">Todos os Estados</option>
            {states.map(state => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          <select value={flagFilter} onChange={e => setFlagFilter(e.target.value)} className={selectClass}>
            <option value="all">Todas as Bandeiras</option>
            <option value="verde">Verde</option>
            <option value="amarela">Amarela</option>
            <option value="vermelha">Vermelha</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-muted">
          Mostrando {filteredTariffs.length} de {tariffs.length} tarifas
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-edge bg-edge/10">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-faint">Estado</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-faint">Tarifa</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-faint">Bandeira</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-faint">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {filteredTariffs.map(tariff => (
                <tr key={tariff.id} className="transition-colors hover:bg-edge/10">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-fg">{tariff.state}</div>
                    <div className="text-xs text-faint">{tariff.state_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-fg font-mono">R$ {tariff.base_tariff.toFixed(4)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={FLAG_VARIANT[tariff.tariff_flag] || 'neutral'} className="capitalize">
                      {tariff.tariff_flag}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => openModal(tariff)}
                      className="inline-flex items-center p-2 rounded-md transition-colors text-muted hover:text-volt hover:bg-volt-soft"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTariffs.length === 0 && (
          <EmptyState icon={Search} title="Nenhuma tarifa encontrada" description="Tente ajustar seus critérios de busca ou filtro." />
        )}
      </Panel>

      {editingTariff && (
        <Modal title="Editar Tarifa" onClose={closeModal} maxWidth="max-w-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Estado (Sigla)</label>
                <input type="text" value={formData.state} readOnly className={`${inputClassReadOnly} uppercase`} />
              </div>
              <div>
                <label className={labelClass}>Nome do Estado</label>
                <input type="text" value={formData.state_name} readOnly className={inputClassReadOnly} />
              </div>
            </div>

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
                onChange={e => setFormData({ ...formData, tariff_flag: e.target.value as TariffFlag })}
                required
                className={selectClass}
              >
                <option value="verde">Verde</option>
                <option value="amarela">Amarela</option>
                <option value="vermelha">Vermelha</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 rounded-md border border-edge text-fg hover:bg-edge/30 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-volt text-volt-ink px-4 py-2.5 rounded-md font-semibold hover:bg-volt-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
