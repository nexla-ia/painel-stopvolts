import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  /**
   * Nome do plano gravado em `profiles.plan`. Não é um enum fechado: a tabela
   * `subscription_plans` define free/bronze/prata/ouro, mas a base ainda tem
   * contas marcadas como 'premium', de uma nomenclatura antiga. Por isso é
   * string e a exibição resolve o rótulo pela tabela de planos.
   */
  plan: string;
  role: 'user' | 'admin';
  promo_code_used: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  device_limit: number;
  subscription_status: string | null;
  subscription_end_date: string | null;
  monthly_consumption_kwh: number | null;
  monthly_consumption_cost: number | null;
  estimated_savings: number | null;
  last_login_at: string | null;
  login_count: number;
}

/**
 * Colunas de `profiles` que o painel administrativo busca.
 *
 * Lista explícita em vez de `select('*')` de propósito: o endereço residencial
 * (street, zip_code) não é carregado, para o painel não trafegar dado pessoal
 * que não precisa exibir. Cidade/estado ficam por serem usados nos filtros e na
 * distribuição regional do painel.
 */
export const PROFILE_COLUMNS = [
  'id',
  'email',
  'full_name',
  'phone',
  'city',
  'state',
  'plan',
  'role',
  'promo_code_used',
  'created_at',
  'updated_at',
  'is_active',
  'device_limit',
  'subscription_status',
  'subscription_end_date',
  'monthly_consumption_kwh',
  'monthly_consumption_cost',
  'estimated_savings',
  'last_login_at',
  'login_count',
].join(', ');

export interface Device {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  power_watts: number;
  hours_per_day: number;
  days_per_week: number;
  is_active: boolean;
  quantity: number;
  created_at: string;
  profiles?: Profile;
}

export interface SubscriptionPlan {
  id: string;
  plan_name: string;
  display_name: string;
  price_brl: number;
  device_limit: number;
  features: string[] | null;
  is_active: boolean;
}

/** Rótulo de exibição de um plano, com fallback para planos fora da tabela. */
export function planLabel(plan: string, plans: Record<string, SubscriptionPlan>) {
  const known = plans[plan];
  if (known) return known.display_name.replace(/\s*\(.*\)\s*$/, '');
  if (!plan) return 'Sem plano';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

/** Planos pagos aparecem destacados; o gratuito é o padrão da base. */
export const isPaidPlan = (plan: string) => Boolean(plan) && plan !== 'free';

export interface DeviceCategory {
  id: string;
  name: string;
  icon: string | null;
}

export interface UserStats {
  user_id: string;
  full_name: string | null;
  total_devices: number;
  active_devices: number;
  estimated_monthly_kwh: number | null;
  estimated_monthly_cost: number | null;
  achievements_count: number;
  total_points: number;
  leaderboard_rank: number | null;
}

export interface EnergyGoal {
  id: string;
  user_id: string;
  target_kwh: number;
  current_kwh: number;
  month: number;
  year: number;
  created_at: string;
  profiles?: Profile;
}

export interface PromoCode {
  id: string;
  code: string;
  influencer_name: string;
  discount_type: string;
  discount_value: number | null;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tip {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  created_at: string;
}

export interface EnergyTariff {
  id: string;
  state: string;
  state_name: string;
  base_tariff: number;
  distributor: string;
  tariff_flag: string;
  flag_value: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
