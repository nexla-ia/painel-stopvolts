import { useEffect, useState } from 'react';
import { supabase, EnergyTariff } from '../lib/supabase';
import { Search, Edit2, X } from 'lucide-react';

interface TariffsProps {
  darkMode: boolean;
}

export default function Tariffs({ darkMode }: TariffsProps) {
  const [tariffs, setTariffs] = useState<EnergyTariff[]>([]);
  const [filteredTariffs, setFilteredTariffs] = useState<EnergyTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [flagFilter, setFlagFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<EnergyTariff | null>(null);
  const [formData, setFormData] = useState({
    state: '',
    state_name: '',
    base_tariff: '',
    tariff_flag: 'verde',
  });

  useEffect(() => {
    loadTariffs();
  }, []);

  useEffect(() => {
    filterTariffs();
  }, [tariffs, searchTerm, stateFilter, flagFilter]);

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
    } finally {
      setLoading(false);
    }
  };

  const filterTariffs = () => {
    let filtered = [...tariffs];

    if (searchTerm) {
      filtered = filtered.filter(tariff =>
        tariff.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tariff.state_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tariff.distributor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (stateFilter !== 'all') {
      filtered = filtered.filter(tariff => tariff.state === stateFilter);
    }

    if (flagFilter !== 'all') {
      filtered = filtered.filter(tariff => tariff.tariff_flag === flagFilter);
    }

    setFilteredTariffs(filtered);
  };

  const openModal = (tariff: EnergyTariff) => {
    setEditingTariff(tariff);
    setFormData({
      state: tariff.state,
      state_name: tariff.state_name,
      base_tariff: tariff.base_tariff.toString(),
      tariff_flag: tariff.tariff_flag,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTariff(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingTariff) return;

    try {
      const tariffData = {
        base_tariff: parseFloat(formData.base_tariff),
        tariff_flag: formData.tariff_flag,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('energy_tariffs')
        .update(tariffData)
        .eq('id', editingTariff.id);

      if (error) throw error;

      await loadTariffs();
      closeModal();
    } catch (error) {
      console.error('Error saving tariff:', error);
      alert('Erro ao salvar tarifa');
    }
  };

  const states = [...new Set(tariffs.map(t => t.state))].sort();

  const getFlagColor = (flag: string) => {
    switch (flag) {
      case 'verde':
        return 'bg-green-100 text-green-700';
      case 'amarela':
        return 'bg-yellow-100 text-yellow-700';
      case 'vermelha':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Tarifas de Energia</h1>
        <p className={`mt-1 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>Gerenciar tarifas por estado e distribuidora</p>
      </div>

      <div className={`rounded-lg p-5 ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="relative mb-4">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Buscar por estado, nome ou distribuidora..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              darkMode
                ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400'
                : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        <div className="flex gap-3">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className={`px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              darkMode
                ? 'bg-slate-700/50 border border-slate-600 text-white'
                : 'bg-white border border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">Todos os Estados</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          <select
            value={flagFilter}
            onChange={(e) => setFlagFilter(e.target.value)}
            className={`px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              darkMode
                ? 'bg-slate-700/50 border border-slate-600 text-white'
                : 'bg-white border border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">Todas as Bandeiras</option>
            <option value="verde">Verde</option>
            <option value="amarela">Amarela</option>
            <option value="vermelha">Vermelha</option>
          </select>
        </div>

        <div className={`mt-4 text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
          Mostrando {filteredTariffs.length} de {tariffs.length} tarifas
        </div>
      </div>

      <div className={`rounded-lg overflow-hidden ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Estado
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Tarifa
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Bandeira
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Editar
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
              {filteredTariffs.map((tariff) => (
                <tr key={tariff.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {tariff.state}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {tariff.state_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-900'}`}>
                      R$ {tariff.base_tariff.toFixed(4)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium capitalize ${getFlagColor(tariff.tariff_flag)}`}>
                      {tariff.tariff_flag}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => openModal(tariff)}
                      className={`inline-flex items-center p-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                      }`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && editingTariff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg max-w-lg w-full ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Editar Tarifa
              </h2>
              <button
                onClick={closeModal}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Estado (Sigla)
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    readOnly
                    className={`w-full px-4 py-2.5 rounded-lg uppercase cursor-not-allowed ${
                      darkMode
                        ? 'bg-slate-900/50 border border-slate-600 text-slate-400'
                        : 'bg-gray-100 border border-gray-300 text-gray-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Nome do Estado
                  </label>
                  <input
                    type="text"
                    value={formData.state_name}
                    readOnly
                    className={`w-full px-4 py-2.5 rounded-lg cursor-not-allowed ${
                      darkMode
                        ? 'bg-slate-900/50 border border-slate-600 text-slate-400'
                        : 'bg-gray-100 border border-gray-300 text-gray-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Tarifa Base (R$/kWh)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.base_tariff}
                  onChange={(e) => setFormData({ ...formData, base_tariff: e.target.value })}
                  required
                  className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    darkMode
                      ? 'bg-slate-700/50 border border-slate-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                  placeholder="0.7856"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Bandeira Tarifária
                </label>
                <select
                  value={formData.tariff_flag}
                  onChange={(e) => setFormData({ ...formData, tariff_flag: e.target.value })}
                  required
                  className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    darkMode
                      ? 'bg-slate-700/50 border border-slate-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
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
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    darkMode
                      ? 'bg-slate-700 text-white hover:bg-slate-600'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
