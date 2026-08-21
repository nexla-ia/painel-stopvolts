import { useEffect, useMemo, useState, FormEvent } from 'react';
import { supabase, PromoCode } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Tag, Plus, Trash2, Search, ChevronRight, TicketCheck, CalendarClock, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Panel from '../components/ui/Panel';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import SplitView from '../components/ui/SplitView';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';
import { inputClass, labelClass, selectClass, splitItemClass } from '../components/ui/classes';

const EMPTY_FORM = { code: '', influencer_name: '', expires_at: '', max_uses: '' };

const isExpired = (code: PromoCode) => Boolean(code.expires_at && new Date(code.expires_at) < new Date());

export default function PromoCodes() {
  const toast = useToast();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
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
      const loaded = data || [];
      setPromoCodes(loaded);
      setSelectedId(prev => prev ?? loaded[0]?.id ?? null);
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
      if (selectedId === deleteTarget.id) setSelectedId(null);
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

  const filteredCodes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return promoCodes.filter(code => {
      if (term) {
        const haystack = `${code.code} ${code.influencer_name}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (statusFilter === 'active' && !code.is_active) return false;
      if (statusFilter === 'inactive' && code.is_active) return false;
      if (statusFilter === 'expired' && !isExpired(code)) return false;
      return true;
    });
  }, [promoCodes, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-72 mb-2" />
          <Skeleton className="h-4 w-56" />
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

  const activeCount = promoCodes.filter(c => c.is_active).length;
  const expiredCount = promoCodes.filter(isExpired).length;
  const totalUses = promoCodes.reduce((sum, c) => sum + (c.current_uses || 0), 0);

  const selectedCode = filteredCodes.find(c => c.id === selectedId) || filteredCodes[0] || null;

  const addButton = (
    <button
      onClick={() => setShowModal(true)}
      className="flex items-center gap-2 px-4 py-2.5 bg-volt text-volt-ink rounded-md hover:bg-volt-strong transition-colors font-semibold text-sm shadow-lg shadow-volt/20"
    >
      <Plus className="w-4 h-4" />
      Adicionar Código
    </button>
  );

  return (
    <div className="flex flex-col gap-6 lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Growth"
        title="Códigos Promocionais"
        subtitle="Gerenciar códigos promocionais e acompanhar o uso de cada influenciador"
        actions={addButton}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} icon={Tag} accent="volt" label="Total de Códigos" value={promoCodes.length} />
        <StatCard index={1} icon={TicketCheck} accent="success" label="Códigos Ativos" value={activeCount} />
        <StatCard index={2} icon={Users} accent="info" label="Usos Totais" value={totalUses} />
        <StatCard
          index={3}
          icon={CalendarClock}
          accent="danger"
          label="Expirados"
          value={expiredCount}
          sublabel="Passaram da data limite"
        />
      </div>

      {promoCodes.length > 0 && (
        <Panel className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              type="text"
              placeholder="Buscar por código ou influenciador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className={selectClass}
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="expired">Expirados</option>
            </select>
          </div>

          <div className="text-sm text-muted">
            Mostrando {filteredCodes.length} de {promoCodes.length} códigos
          </div>
        </Panel>
      )}

      {filteredCodes.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Tag}
            title={
              promoCodes.length === 0
                ? 'Nenhum código promocional encontrado'
                : 'Nenhum código bate com o filtro'
            }
            description={
              promoCodes.length === 0
                ? 'Crie seu primeiro código promocional para começar.'
                : 'Tente ajustar seus critérios de busca ou filtro.'
            }
          />
        </Panel>
      ) : (
        <div className="lg:flex-1 lg:min-h-0">
          <SplitView
            listLabel={`${filteredCodes.length} códigos`}
            list={filteredCodes.map(code => {
              const isSelected = selectedCode?.id === code.id;
              const expired = isExpired(code);
              return (
                <button
                  key={code.id}
                  onClick={() => setSelectedId(code.id)}
                  className={splitItemClass(isSelected, expired)}
                >
                  <div className="shrink-0 h-9 w-9 bg-volt-soft rounded-md flex items-center justify-center">
                    <Tag className="w-4 h-4 text-volt" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold font-mono text-fg truncate">{code.code}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={expired ? 'danger' : code.is_active ? 'success' : 'neutral'}>
                        {expired ? 'Expirado' : code.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <span className="text-[11px] text-faint truncate font-tabular">
                        {code.current_uses} / {code.max_uses || '∞'} usos
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-volt' : 'text-faint'}`}
                  />
                </button>
              );
            })}
            detail={
              selectedCode && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 h-14 w-14 bg-volt-soft rounded-md flex items-center justify-center">
                      <Tag className="w-6 h-6 text-volt" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-mono font-bold text-xl text-fg truncate">{selectedCode.code}</h2>
                      <p className="text-sm text-faint truncate">{selectedCode.influencer_name}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <Badge
                          variant={
                            isExpired(selectedCode)
                              ? 'danger'
                              : selectedCode.is_active
                                ? 'success'
                                : 'neutral'
                          }
                        >
                          {isExpired(selectedCode)
                            ? 'Expirado'
                            : selectedCode.is_active
                              ? 'Ativo'
                              : 'Inativo'}
                        </Badge>
                        <Badge variant="info">
                          {selectedCode.discount_value
                            ? `${selectedCode.discount_value}% de desconto`
                            : 'Sem desconto'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="border border-edge rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-muted" />
                      <h3 className="font-display font-bold text-sm text-fg uppercase tracking-wide">
                        Uso do Código
                      </h3>
                    </div>

                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="font-display font-bold text-4xl text-fg font-tabular">
                        {selectedCode.current_uses}
                      </span>
                      <span className="text-sm text-muted font-tabular">
                        de {selectedCode.max_uses || '∞'} usos disponíveis
                      </span>
                    </div>

                    {selectedCode.max_uses && (
                      <div className="rounded-full h-2 bg-edge">
                        <div
                          className="bg-volt h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((selectedCode.current_uses / selectedCode.max_uses) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="border border-edge rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarClock className="w-4 h-4 text-muted" />
                      <h3 className="font-display font-bold text-sm text-fg uppercase tracking-wide">
                        Detalhes
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-faint mb-0.5">
                          Influenciador
                        </p>
                        <p className="text-sm font-medium text-fg">{selectedCode.influencer_name}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-faint mb-0.5">
                          Tipo de Desconto
                        </p>
                        <p className="text-sm font-medium text-fg capitalize">{selectedCode.discount_type}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-faint mb-0.5">Criado em</p>
                        <p className="text-sm font-medium text-fg">
                          {new Date(selectedCode.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-faint mb-0.5">Expira em</p>
                        <p className="text-sm font-medium text-fg">
                          {selectedCode.expires_at
                            ? new Date(selectedCode.expires_at).toLocaleDateString('pt-BR')
                            : 'Nunca'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => toggleActive(selectedCode.id, selectedCode.is_active)}
                      className={`px-4 py-2.5 rounded-md font-semibold text-sm transition-colors border ${
                        selectedCode.is_active
                          ? 'bg-edge/30 text-fg border-edge-strong hover:bg-edge/50'
                          : 'bg-success-soft text-success border-success/25 hover:bg-success/20'
                      }`}
                    >
                      {selectedCode.is_active ? 'Desativar Código' : 'Ativar Código'}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(selectedCode)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold text-sm transition-colors text-danger border border-danger/25 hover:bg-danger-soft"
                    >
                      <Trash2 className="w-4 h-4" />
                      Apagar Código
                    </button>
                  </div>
                </div>
              )
            }
          />
        </div>
      )}

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
