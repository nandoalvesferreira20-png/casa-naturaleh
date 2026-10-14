-- Somente consulta. Executar primeiro para confirmar o schema real.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
  AND column_name IN ('estoque', 'unidade');

-- Executar manualmente SOMENTE se unidade não existir.
-- Não presume a unidade dos produtos antigos: eles ficam NULL até revisão.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unidade text;

COMMENT ON COLUMN public.products.unidade IS
  'Unidade comercial: UN (estoque em unidades) ou KG (estoque inteiro em gramas). O preço da origem é preservado sem conversão.';

-- Nenhum estoque existente é convertido por este SQL.
-- Se unidade já existir, verificar seus valores/tipo antes de reutilizar.
