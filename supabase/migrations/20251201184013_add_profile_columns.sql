/*
  # Adicionar colunas ao perfil de usuário

  1. Alterações na Tabela `profiles`
    - `full_name` (text) - Nome completo do usuário
    - `phone` (text) - Telefone de contato
    - `state` (text) - Estado (UF)
    - `plan` (text) - Tipo de plano (basic ou premium)
    - `promo_code` (text) - Código promocional usado no cadastro
  
  2. Notas
    - Todas as colunas são opcionais (nullable)
    - Plano padrão é 'basic'
    - Usa IF NOT EXISTS para evitar erros
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN full_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'state'
  ) THEN
    ALTER TABLE profiles ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan text DEFAULT 'basic';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'promo_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN promo_code text;
  END IF;
END $$;