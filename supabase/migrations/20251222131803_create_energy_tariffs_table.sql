/*
  # Create Energy Tariffs Table

  1. New Tables
    - `energy_tariffs`
      - `id` (uuid, primary key)
      - `state` (text) - State abbreviation (e.g., PE, RJ, SP)
      - `state_name` (text) - Full state name
      - `base_tariff` (numeric) - Base energy tariff rate
      - `distributor` (text) - Energy distributor name
      - `tariff_flag` (text) - Tariff flag color (verde, amarela, vermelha)
      - `flag_value` (numeric) - Additional flag value
      - `valid_year` (integer) - Year the tariff is valid for
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `energy_tariffs` table
    - Add policy for authenticated users to read tariffs
    - Add policy for admin users to manage tariffs
*/

CREATE TABLE IF NOT EXISTS energy_tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  state_name text NOT NULL,
  base_tariff numeric NOT NULL,
  distributor text NOT NULL,
  tariff_flag text NOT NULL DEFAULT 'verde',
  flag_value numeric NOT NULL DEFAULT 0.0,
  valid_year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE energy_tariffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tariffs"
  ON energy_tariffs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert tariffs"
  ON energy_tariffs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update tariffs"
  ON energy_tariffs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete tariffs"
  ON energy_tariffs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_energy_tariffs_state ON energy_tariffs(state);
CREATE INDEX IF NOT EXISTS idx_energy_tariffs_valid_year ON energy_tariffs(valid_year);