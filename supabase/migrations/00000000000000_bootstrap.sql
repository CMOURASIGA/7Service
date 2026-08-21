-- 7Service - Bootstrap
--
-- Etapa 0: apenas prepara a extensão necessária para UUIDs. O schema de
-- domínio (enums, clients, products, subscriptions, identities, etc.) é
-- entregue na Etapa 2, conforme docs/DEV_IMPLEMENTATION_PLAN.md.

create extension if not exists "pgcrypto";
