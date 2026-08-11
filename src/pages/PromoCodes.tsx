import { useEffect, useState } from 'react';
import { supabase, PromoCode } from '../lib/supabase';
import { Tag, Plus, X, Trash2, AlertTriangle } from 'lucide-react';

interface PromoCodesProps {
  darkMode: boolean;
}

export default function PromoCodes({ darkMode }: PromoCodesProps) {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; id: string; code: string; influencerName: string } | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    influencer_name: '',
    expires_at: '',
    max_uses: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error loading promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await loadPromoCodes();
    } catch (error) {
      console.error('Error toggling promo code:', error);
    }
  };

  const deletePromoCode = async () => {
    if (!deleteModal) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', deleteModal.id);

      if (error) throw error;
      await loadPromoCodes();
      setDeleteModal(null);
    } catch (error) {
      console.error('Error deleting promo code:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('promo_codes')
        .insert([{
          code: formData.code.toUpperCase(),
          influencer_name: formData.influencer_name,
          expires_at: formData.expires_at || null,
          max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
          discount_type: 'percentage',
          discount_value: 10,
          current_uses: 0,
          is_active: true
        }]);

      if (error) throw error;

      setFormData({ code: '', influencer_name: '', expires_at: '', max_uses: '' });
      setShowModal(false);
      await loadPromoCodes();
    } catch (error) {
      console.error('Error creating promo code:', error);
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Códigos Promocionais</h1>
          <p className={`mt-1 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>Gerenciar códigos promocionais</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-600/50"
        >
          <Plus className="w-5 h-5" />
          Adicionar Código
        </button>
      </div>

      <div className={`rounded-lg overflow-hidden ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Nome Influ.
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Código
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Expira
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Uso
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Ativo
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
              {promoCodes.map((code) => (
                <tr key={code.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{code.influencer_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Tag className="w-4 h-4 text-white" />
                      </div>
                      <div className={`text-sm font-bold font-mono ${darkMode ? 'text-white' : 'text-gray-900'}`}>{code.code}</div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-slate-300' : 'text-gray-900'}`}>
                    {code.expires_at ? new Date(code.expires_at).toLocaleDateString('pt-BR') : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-900'}`}>
                      {code.current_uses} / {code.max_uses || '∞'}
                    </div>
                    {code.max_uses && (
                      <div className={`w-32 rounded-full h-1.5 mt-1 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min((code.current_uses / code.max_uses) * 100, 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(code.id, code.is_active)}
                      className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                        code.is_active
                          ? darkMode
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                          : darkMode
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {code.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setDeleteModal({ show: true, id: code.id, code: code.code, influencerName: code.influencer_name })}
                      className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                      title="Apagar código"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {promoCodes.length === 0 && (
          <div className="text-center py-12">
            <Tag className={`mx-auto h-12 w-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />
            <h3 className={`mt-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Nenhum código promocional encontrado</h3>
            <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Crie seu primeiro código promocional para começar.</p>
          </div>
        )}
      </div>

      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>

              <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
                Apagar Código Promocional
              </h2>

              <p className="text-sm text-gray-600 text-center mb-4">
                Tem certeza que deseja apagar o código <span className="font-mono font-bold text-gray-900">{deleteModal.code}</span> do influenciador <span className="font-semibold text-gray-900">{deleteModal.influencerName}</span>?
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-red-700 text-center">
                  Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={deletePromoCode}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Apagando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Apagar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Adicionar Código Promocional</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Influenciador
                </label>
                <input
                  type="text"
                  required
                  value={formData.influencer_name}
                  onChange={(e) => setFormData({ ...formData, influencer_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código (até 10 caracteres)
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="Ex: JOAO10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Expiração (opcional)
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
