-- Migration: Add new availability fields to professionals table
-- Date: 2026-02-07
-- Description: Adds fields for intelligent availability system based on professional type

-- Frase curta do profissional (ex: "Atendo rapido e faco orcamento sem compromisso")
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS short_phrase TEXT;

-- Data de inicio do proximo trabalho (para pintores, pedreiros, etc)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS next_work_start_date DATE;

-- Tipo de disponibilidade: 'slots' (vagas diarias) ou 'project' (data de inicio)
-- Lavador de carro, marido de aluguel, chaveiro, montador = 'slots'
-- Pintor, pedreiro, eletricista = 'project'
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS availability_type TEXT DEFAULT 'project';

-- Disponivel para orcamentos (sim/nao)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS accepts_quotes BOOLEAN DEFAULT true;

-- Update existing professionals with availability_type based on profession
UPDATE professionals
SET availability_type = 'slots'
WHERE profession IN ('marido_aluguel', 'chaveiro', 'montador_moveis');

-- Add constraint to ensure valid availability_type values
ALTER TABLE professionals DROP CONSTRAINT IF EXISTS check_availability_type;
ALTER TABLE professionals ADD CONSTRAINT check_availability_type
  CHECK (availability_type IN ('slots', 'project'));

-- Create index for faster filtering by availability_type
CREATE INDEX IF NOT EXISTS idx_professionals_availability_type ON professionals(availability_type);

-- Comment: Fields already existing that will be used for badges:
-- average_response_time_minutes -> "Responde Rapido" badge (< 30 min)
-- is_approved -> "Verificado" badge
-- plan_type -> "Premium" badge
-- total_quotes_responded -> quote counter
-- service_radius_km, latitude, longitude -> service area map
