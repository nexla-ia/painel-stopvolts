import { useEffect, useState, FormEvent } from 'react';
import { supabase, PromoCode } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Tag, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';
import { inputClass, labelClass } from '../components/ui/classes';

const EMPTY_FORM = { code: '', influencer_name: '', expires_at: '', max_uses: '' };

export default function PromoCodes() {
  const toast = useToast();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
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
      toast.error('Não foi possível carregar os códigos promocionais.');
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
      toast.error('Não foi possível atualizar o status do código.');
    }
  };

  const deletePromoCode = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from('promo_codes').delete().eq('id', deleteTarget.id);

      if (error) throw error;
      await loadPromoCodes();
      toast.success(`Código ${deleteTarget.code} apagado.`);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting promo code:', error);
      toast.error('Não foi possível apagar o código promocional.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('promo_codes').insert([
        {
          code: formData.code.toUpperCase(),
          influencer_name: formData.influencer_name,
          expires_at: formData.expires_at || null,
          max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
          discount_type: 'percentage',
          discount_value: 10,
          current_uses: 0,
          is_active: true,
        },
      ]);

      if (error) throw error;

      toast.success(`Código ${formData.code.toUpperCase()} criado.`);
      setFormData(EMPTY_FORM);
      setShowModal(false);
      await loadPromoCodes();
    } catch (error) {
      console.error('Error creating promo code:', error);
      toast.error('Não foi possível criar o código promocional.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-72 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Growth"
        title="Códigos Promocionais"
        subtitle="Gerenciar códigos promocionais"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-volt text-volt-ink rounded-md hover:bg-volt-strong transition-colors font-semibold text-sm shadow-lg shadow-volt/20"
          >
            <Plus className="w-4 h-4" />
            Adicionar Código
          </button>
        }
      />

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-edge bg-edge/10">
              <tr>
                {['Nome Influ.', 'Código', 'Expira', 'Uso', 'Ativo', 'Ações'].map(header => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-faint"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {promoCodes.map(code => (
                <tr key={code.id} className="transition-colors hover:bg-edge/10">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-fg">{code.influencer_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 h-8 w-8 bg-volt-soft rounded-md flex items-center justify-center">
                        <Tag className="w-3.5 h-3.5 text-volt" />
                      </div>
                      <div className="text-sm font-bold font-mono text-fg">{code.code}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                    {code.expires_at ? new Date(code.expires_at).toLocaleDateString('pt-BR') : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted font-tabular">
                      {code.current_uses} / {code.max_uses || '∞'}
                    </div>
                    {code.max_uses && (
                      <div className="w-32 rounded-full h-1.5 mt-1.5 bg-edge">
                        <div
                          className="bg-volt h-1.5 rounded-full"
                          style={{ width: `${Math.min((code.current_uses / code.max_uses) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(code.id, code.is_active)}
                      className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors border ${
                        code.is_active
                          ? 'bg-success-soft text-success border-success/25 hover:bg-success/20'
                          : 'bg-edge/30 text-faint border-edge-strong hover:bg-edge/50'
                      }`}
                    >
                      {code.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setDeleteTarget(code)}
                      className="p-2 rounded-md transition-colors text-danger hover:bg-danger-soft"
                      title="Apagar código"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {promoCodes.length === 0 && (
          <EmptyState
            icon={Tag}
            title="Nenhum código promocional encontrado"
            description="Crie seu primeiro código promocional para começar."
          />
        )}
      </Panel>

      {deleteTarget && (
        <ConfirmDialog
          title="Apagar Código Promocional"
          description={
            <>
              Tem certeza que deseja apagar o código{' '}
              <span className="font-mono font-bold text-fg">{deleteTarget.code}</span> do influenciador{' '}
              <span className="font-semibold text-fg">{deleteTarget.influencer_name}</span>?
            </>
          }
          warning="Esta ação não pode ser desfeita."
          confirmLabel="Apagar"
          pendingLabel="Apagando..."
          pending={deleting}
          onConfirm={deletePromoCode}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showModal && (
        <Modal title="Adicionar Código Promocional" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className={labelClass}>Nome do Influenciador</label>
              <input
                type="text"
                required
                value={formData.influencer_name}
                onChange={e => setFormData({ ...formData, influencer_name: e.target.value })}
                className={inputClass}
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className={labelClass}>Código (até 10 caracteres)</label>
              <input
                type="text"
                required
                maxLength={10}
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className={`${inputClass} font-mono`}
                placeholder="Ex: JOAO10"
              />
            </div>

            <div>
              <label className={labelClass}>Data de Expiração (opcional)</label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-md border border-edge text-fg hover:bg-edge/30 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-volt text-volt-ink rounded-md hover:bg-volt-strong transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    Salvando...
                  </>
                ) : (
                  'Adicionar'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
