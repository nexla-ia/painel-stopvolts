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
  plan: 'free' | 'premium';
  role: 'user' | 'admin';
  promo_code_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  name: string;
  category: string;
  power_watts: number;
  hours_per_day: number;
  quantity: number;
  created_at: string;
  profiles?: Profile;
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
