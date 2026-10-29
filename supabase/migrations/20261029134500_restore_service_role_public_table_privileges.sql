-- A camada administrativa do 7Service executa as rotinas atômicas pelo
-- service_role, exclusivamente no servidor. Esta é a configuração prevista
-- na fundação do esquema e não concede acesso a anon ou authenticated.

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
