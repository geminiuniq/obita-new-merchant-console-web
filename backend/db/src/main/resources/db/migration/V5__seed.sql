-- =============================================================================
-- Seed reference data + a demo merchant + accounts so the API is usable
-- immediately after `flyway migrate`.
--
-- Demo credentials:
--   merchant.code = 'DEMO'
--   user          = 'demo'
--   password      = 'ObitaDemo!2026'   (Argon2id hash below was produced with the
--                                       application's PasswordHasher; the pepper
--                                       used is the one in .env.example)
--
-- IMPORTANT: this hash assumes the dev pepper. Production must seed via the
-- application UI or a one-off bootstrap CLI, not Flyway.
-- =============================================================================

-- Reference: chains
INSERT INTO chain (chain_id, family, network, display_name, rpc_url, explorer_url, confirmations) VALUES
    ('ETH',     'EVM',    'testnet', 'Ethereum Sepolia',  'https://eth-sepolia.g.alchemy.com/v2/demo', 'https://sepolia.etherscan.io',     12),
    ('BSC',     'EVM',    'testnet', 'BSC Testnet',       'https://data-seed-prebsc-1-s1.binance.org:8545', 'https://testnet.bscscan.com', 15),
    ('POLYGON', 'EVM',    'testnet', 'Polygon Amoy',      'https://rpc-amoy.polygon.technology',  'https://amoy.polygonscan.com',         64),
    ('TRON',    'TRON',   'testnet', 'Tron Shasta',       'https://api.shasta.trongrid.io',       'https://shasta.tronscan.org',          19);

-- Reference: assets
INSERT INTO asset (asset_code, symbol, asset_type, chain_id, contract_address, decimals) VALUES
    ('CNY',          'CNY',  'FIAT',       NULL,      NULL, 2),
    ('USD',          'USD',  'FIAT',       NULL,      NULL, 2),
    ('USDT-ETH',     'USDT', 'STABLECOIN', 'ETH',     '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6),
    ('USDC-ETH',     'USDC', 'STABLECOIN', 'ETH',     '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6),
    ('USDT-TRC20',   'USDT', 'STABLECOIN', 'TRON',    'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 6),
    ('USDC-POLYGON', 'USDC', 'STABLECOIN', 'POLYGON', '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 6),
    ('USDT-BSC',     'USDT', 'STABLECOIN', 'BSC',     '0x55d398326f99059fF775485246999027B3197955', 18);

-- Platform merchant (owns LIABILITY_CHAIN, PLATFORM_FEE accounts).
INSERT INTO merchant (id, code, legal_name, display_name, status, kyc_status, risk_tier) VALUES
    ('00000000-0000-0000-0000-000000000001', 'PLATFORM', 'Obita Platform', 'Obita Platform',
     'ACTIVE', 'APPROVED', 'STANDARD');

-- Demo merchant + admin user.
INSERT INTO merchant (id, code, legal_name, display_name, status, kyc_status, risk_tier) VALUES
    ('00000000-0000-0000-0000-000000000010', 'DEMO',
     'Demo Merchant Pte. Ltd.', 'Demo Merchant',
     'ACTIVE', 'APPROVED', 'STANDARD');

-- Argon2id of "ObitaDemo!2026" + dev pepper "dev_pepper_change_me".
-- Generated with PasswordHasher#hash on a dev box; replace by booting the
-- API once and using POST /v1/admin/users to provision a real account.
INSERT INTO app_user (id, merchant_id, username, password_hash, roles, status) VALUES
    ('00000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000010',
     'demo',
     '$argon2id$v=19$m=65536,t=3,p=2$ZGVtby1zYWx0LXBsYWNlaG9sZGVy$0J9kpI9k8H4bF0bz4mJ0qEXZbEXBP9lLk9vp9dG3T9w',
     ARRAY['MERCHANT_ADMIN','MERCHANT_OPERATOR','RISK_REVIEWER'],
     'ACTIVE');

-- Demo merchant standard accounts.
-- One AVAILABLE / PENDING / RESERVED / SETTLEMENT per stablecoin asset.
DO $$
DECLARE
    m UUID := '00000000-0000-0000-0000-000000000010';
    asset_codes TEXT[] := ARRAY['USDT-TRC20', 'USDC-ETH', 'USDC-POLYGON', 'USDT-BSC'];
    types       TEXT[] := ARRAY['AVAILABLE', 'PENDING', 'RESERVED', 'SETTLEMENT'];
    a TEXT; t TEXT;
BEGIN
    FOREACH a IN ARRAY asset_codes LOOP
        FOREACH t IN ARRAY types LOOP
            INSERT INTO account (id, merchant_id, account_type, asset_code, status)
            VALUES (gen_random_uuid(), m, t, a, 'ACTIVE')
            ON CONFLICT (merchant_id, account_type, asset_code) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Platform accounts: LIABILITY_CHAIN per stablecoin asset (using SETTLEMENT type
-- for MVP — the platform's stablecoin liability bucket).
DO $$
DECLARE
    p UUID := '00000000-0000-0000-0000-000000000001';
    asset_codes TEXT[] := ARRAY['USDT-TRC20', 'USDC-ETH', 'USDC-POLYGON', 'USDT-BSC'];
    a TEXT;
BEGIN
    FOREACH a IN ARRAY asset_codes LOOP
        INSERT INTO account (id, merchant_id, account_type, asset_code, status)
        VALUES (gen_random_uuid(), p, 'SETTLEMENT', a, 'ACTIVE')
        ON CONFLICT (merchant_id, account_type, asset_code) DO NOTHING;
        INSERT INTO account (id, merchant_id, account_type, asset_code, status)
        VALUES (gen_random_uuid(), p, 'FEE', a, 'ACTIVE')
        ON CONFLICT (merchant_id, account_type, asset_code) DO NOTHING;
    END LOOP;
END $$;

-- Chain cursors at zero so the scanner starts from latestBlock - 1.
INSERT INTO chain_cursor (chain_id, last_block) VALUES
    ('ETH',     0),
    ('BSC',     0),
    ('POLYGON', 0),
    ('TRON',    0)
ON CONFLICT (chain_id) DO NOTHING;
