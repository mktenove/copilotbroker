-- Rename the default project to "Empreendimento Padrão" with city Porto Alegre
UPDATE projects
SET
  name = 'Empreendimento Padrão',
  city = 'Porto Alegre'
WHERE name = 'Condomínio Alto Padrão Estância Velha';
