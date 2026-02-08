-- =====================================================
-- MIGRAÇÃO: Criar tabelas e bucket para Portfolio
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela portfolio_items
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  service_type VARCHAR(100),
  project_value DECIMAL(10,2),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela portfolio_photos
CREATE TABLE IF NOT EXISTS public.portfolio_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_item_id UUID NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_portfolio_items_professional_id ON public.portfolio_items(professional_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_is_active ON public.portfolio_items(is_active);
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_item_id ON public.portfolio_photos(portfolio_item_id);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para portfolio_items

-- Qualquer um pode ler itens ativos
CREATE POLICY "Qualquer um pode ver portfolio_items ativos"
  ON public.portfolio_items
  FOR SELECT
  USING (is_active = true);

-- Profissional pode ver seus próprios itens (inclusive inativos)
CREATE POLICY "Profissional pode ver seus portfolio_items"
  ON public.portfolio_items
  FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- Profissional pode inserir seus próprios itens
CREATE POLICY "Profissional pode inserir portfolio_items"
  ON public.portfolio_items
  FOR INSERT
  WITH CHECK (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- Profissional pode atualizar seus próprios itens
CREATE POLICY "Profissional pode atualizar seus portfolio_items"
  ON public.portfolio_items
  FOR UPDATE
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- Profissional pode deletar seus próprios itens
CREATE POLICY "Profissional pode deletar seus portfolio_items"
  ON public.portfolio_items
  FOR DELETE
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- 6. Políticas RLS para portfolio_photos

-- Qualquer um pode ver fotos de itens ativos
CREATE POLICY "Qualquer um pode ver portfolio_photos"
  ON public.portfolio_photos
  FOR SELECT
  USING (
    portfolio_item_id IN (
      SELECT id FROM public.portfolio_items WHERE is_active = true
    )
  );

-- Profissional pode ver fotos dos seus itens
CREATE POLICY "Profissional pode ver suas portfolio_photos"
  ON public.portfolio_photos
  FOR SELECT
  USING (
    portfolio_item_id IN (
      SELECT pi.id FROM public.portfolio_items pi
      JOIN public.professionals p ON p.id = pi.professional_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Profissional pode inserir fotos nos seus itens
CREATE POLICY "Profissional pode inserir portfolio_photos"
  ON public.portfolio_photos
  FOR INSERT
  WITH CHECK (
    portfolio_item_id IN (
      SELECT pi.id FROM public.portfolio_items pi
      JOIN public.professionals p ON p.id = pi.professional_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Profissional pode deletar fotos dos seus itens
CREATE POLICY "Profissional pode deletar portfolio_photos"
  ON public.portfolio_photos
  FOR DELETE
  USING (
    portfolio_item_id IN (
      SELECT pi.id FROM public.portfolio_items pi
      JOIN public.professionals p ON p.id = pi.professional_id
      WHERE p.user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. Criar bucket 'portfolio' no Storage
-- IMPORTANTE: Execute isso SEPARADAMENTE na seção Storage > Buckets
-- Ou use o SQL abaixo:
-- =====================================================

-- Criar bucket portfolio (público para leitura)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio',
  'portfolio',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 8. Políticas de Storage para o bucket portfolio

-- Qualquer um pode ver arquivos do bucket portfolio
CREATE POLICY "Qualquer um pode ver arquivos do portfolio"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'portfolio');

-- Usuários autenticados podem fazer upload
CREATE POLICY "Usuarios autenticados podem fazer upload no portfolio"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio'
    AND auth.role() = 'authenticated'
  );

-- Usuários autenticados podem deletar seus próprios arquivos
CREATE POLICY "Usuarios autenticados podem deletar do portfolio"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'portfolio'
    AND auth.role() = 'authenticated'
  );

-- =====================================================
-- PRONTO! Após executar, as tabelas e bucket estarão criados
-- =====================================================
