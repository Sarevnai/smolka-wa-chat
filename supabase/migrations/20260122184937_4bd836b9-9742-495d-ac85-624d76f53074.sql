-- Add hero_image column to developments table
ALTER TABLE developments 
ADD COLUMN hero_image TEXT;

COMMENT ON COLUMN developments.hero_image IS 'URL da imagem de capa/apresentação do empreendimento para envio no primeiro contato';