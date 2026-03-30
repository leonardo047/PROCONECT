-- Migration: Inserir categorias de "Outros Tipos de Serviços" que faltam no banco
-- Estas 12 categorias aparecem na Home mas não estavam cadastradas no banco de dados.
-- Usa WHERE NOT EXISTS para não duplicar caso alguma já exista (por slug).

INSERT INTO categories (name, slug, category_group, location, is_active, is_featured, "order")
SELECT * FROM (VALUES
  ('Mecânico', 'mecanico', '✨ Outros Tipos de Serviços', 'home', true, false, 200),
  ('Funilaria/Pintura', 'funilaria_pintura', '✨ Outros Tipos de Serviços', 'home', true, false, 201),
  ('Cabeleireiro', 'cabeleireiro', '✨ Outros Tipos de Serviços', 'home', true, false, 202),
  ('Manicure', 'manicure', '✨ Outros Tipos de Serviços', 'home', true, false, 203),
  ('Estética', 'estetica', '✨ Outros Tipos de Serviços', 'home', true, false, 204),
  ('Pet Shop', 'pet_shop', '✨ Outros Tipos de Serviços', 'home', true, false, 205),
  ('Veterinário', 'veterinario', '✨ Outros Tipos de Serviços', 'home', true, false, 206),
  ('Fotógrafo', 'fotografo', '✨ Outros Tipos de Serviços', 'home', true, false, 207),
  ('Buffet/Eventos', 'buffet_eventos', '✨ Outros Tipos de Serviços', 'home', true, false, 208),
  ('Informática', 'informatica', '✨ Outros Tipos de Serviços', 'home', true, false, 209),
  ('Aulas Particulares', 'aulas_particulares', '✨ Outros Tipos de Serviços', 'home', true, false, 210),
  ('Costureira', 'costureira', '✨ Outros Tipos de Serviços', 'home', true, false, 211)
) AS new_cats(name, slug, category_group, location, is_active, is_featured, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE categories.slug = new_cats.slug
);
