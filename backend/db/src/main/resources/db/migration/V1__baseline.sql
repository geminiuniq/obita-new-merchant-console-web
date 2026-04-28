-- =============================================================================
-- Obita backend baseline schema.
-- Conventions:
--   * All amounts use NUMERIC(38,18). Never float.
--   * Primary keys use UUID (v7 generated app-side for time-ordered locality).
--   * created_at / updated_at use TIMESTAMPTZ. Default now() at row creation only.
--   * Soft delete is forbidden. We use status enums + audit_log + ledger immutability.
--   * Money columns store the *minor unit* count cast to numeric for stablecoins
--     (so USDT 1.5 -> 1.500000000000000000), and CNY uses 2 decimal places.
--     The asset registry rows below define the precision per asset.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- -----------------------------------------------------------------------------
-- Reference data: chains & assets
-- -----------------------------------------------------------------------------
CREATE TABLE chain (
    chain_id        VARCHAR(32)  PRIMARY KEY,           -- e.g. "ETH", "BSC", "TRON", "POLYGON"
    family          VARCHAR(16)  NOT NULL,              -- EVM | TRON | SOLANA | BTC
    network         VARCHAR(16)  NOT NULL,              -- mainnet | testnet
    display_name    VARCHAR(64)  NOT NULL,
    rpc_url         TEXT         NOT NULL,
    explorer_url    TEXT,
    confirmations   INT          NOT NULL DEFAULT 12,   -- min confirmations for credit
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE asset (
    asset_code      VARCHAR(32)  PRIMARY KEY,           -- e.g. "USDT-TRC20", "USDC-ETH", "CNY"
    symbol          VARCHAR(16)  NOT NULL,              -- "USDT", "USDC", "CNY"
    asset_type      VARCHAR(16)  NOT NULL,              -- FIAT | STABLECOIN | CRYPTO
    chain_id        VARCHAR(32)  REFERENCES chain(chain_id),  -- NULL for fiat
    contract_address VARCHAR(128),                      -- token contract; NULL for native/fiat
    decimals        INT          NOT NULL,              -- 6 (USDT/USDC), 2 (CNY), 18 (ETH)
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (decimals BETWEEN 0 AND 30)
);
CREATE INDEX idx_asset_chain ON asset(chain_id);
CREATE INDEX idx_asset_type  ON asset(asset_type);

-- -----------------------------------------------------------------------------
-- Identity: merchants & users
-- -----------------------------------------------------------------------------
CREATE TABLE merchant (
    id              UUID         PRIMARY KEY,
    code            VARCHAR(32)  NOT NULL UNIQUE,        -- public, used in API & dashboards
    legal_name      VARCHAR(128) NOT NULL,
    display_name    VARCHAR(128) NOT NULL,
    status          VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | SUSPENDED | CLOSED
    kyc_status      VARCHAR(16)  NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
    risk_tier       VARCHAR(16)  NOT NULL DEFAULT 'STANDARD',-- STANDARD | ELEVATED | HIGH
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_merchant_status ON merchant(status);

CREATE TABLE app_user (
    id              UUID         PRIMARY KEY,
    merchant_id     UUID         NOT NULL REFERENCES merchant(id),
    email           TEXT,                                -- v1: switch to CITEXT after CREATE EXTENSION citext
    username        VARCHAR(64)  NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,               -- argon2id
    roles           TEXT[]       NOT NULL DEFAULT ARRAY['MERCHANT_OPERATOR'],
    mfa_enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    status          VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (merchant_id, username)
);
CREATE INDEX idx_app_user_merchant ON app_user(merchant_id);

-- -----------------------------------------------------------------------------
-- Account & ledger (double-entry)
-- account: a logical balance container belonging to a merchant for a given asset.
-- ledger_entry: append-only journal. Sum of D == sum of C per tx_id (DB trigger).
-- balance_snapshot: optional materialised view refreshed by job; never the truth.
-- -----------------------------------------------------------------------------
CREATE TABLE account (
    id              UUID         PRIMARY KEY,
    merchant_id     UUID         NOT NULL REFERENCES merchant(id),
    account_type    VARCHAR(24)  NOT NULL,               -- AVAILABLE | PENDING | RESERVED | FEE | SETTLEMENT
    asset_code      VARCHAR(32)  NOT NULL REFERENCES asset(asset_code),
    status          VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (merchant_id, account_type, asset_code)
);
CREATE INDEX idx_account_merchant_asset ON account(merchant_id, asset_code);

CREATE TABLE ledger_tx (
    id              UUID         PRIMARY KEY,
    merchant_id     UUID         NOT NULL REFERENCES merchant(id),
    tx_type         VARCHAR(32)  NOT NULL,               -- DEPOSIT | WITHDRAW | ORDER_SETTLE | REFUND | FEE | INTERNAL
    reference_type  VARCHAR(32),                         -- ORDER | WITHDRAWAL | DEPOSIT | PAYMENT_INTENT
    reference_id    UUID,
    memo            TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_tx_ref ON ledger_tx(reference_type, reference_id);
CREATE INDEX idx_ledger_tx_merchant_created ON ledger_tx(merchant_id, created_at DESC);

CREATE TABLE ledger_entry (
    id              BIGSERIAL    PRIMARY KEY,
    tx_id           UUID         NOT NULL REFERENCES ledger_tx(id),
    account_id      UUID         NOT NULL REFERENCES account(id),
    asset_code      VARCHAR(32)  NOT NULL REFERENCES asset(asset_code),
    direction       CHAR(1)      NOT NULL CHECK (direction IN ('D','C')),
    amount          NUMERIC(38,18) NOT NULL CHECK (amount > 0),
    -- balance_after MAY go negative for platform contra accounts (a negative
    -- LIABILITY balance represents an asset the platform holds). Per-account
    -- non-negative enforcement happens in the application layer with explicit
    -- platform exemption in LedgerPostingService.
    balance_after   NUMERIC(38,18) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_entry_tx ON ledger_entry(tx_id);
CREATE INDEX idx_ledger_entry_account_created ON ledger_entry(account_id, created_at DESC);

-- Trigger: enforce sum(D) == sum(C) per tx after insert at end of transaction.
-- Implemented as a CONSTRAINT TRIGGER deferred until commit.
CREATE OR REPLACE FUNCTION ledger_tx_balance_check() RETURNS trigger AS $$
DECLARE
    debit_total  NUMERIC(38,18);
    credit_total NUMERIC(38,18);
BEGIN
    SELECT
        COALESCE(SUM(CASE WHEN direction='D' THEN amount END),0),
        COALESCE(SUM(CASE WHEN direction='C' THEN amount END),0)
    INTO debit_total, credit_total
    FROM ledger_entry WHERE tx_id = COALESCE(NEW.tx_id, OLD.tx_id);
    IF debit_total <> credit_total THEN
        RAISE EXCEPTION 'Ledger tx % unbalanced: D=% C=%',
            COALESCE(NEW.tx_id, OLD.tx_id), debit_total, credit_total;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_ledger_balance
    AFTER INSERT OR UPDATE OR DELETE ON ledger_entry
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION ledger_tx_balance_check();

-- -----------------------------------------------------------------------------
-- Idempotency keys (per merchant)
-- -----------------------------------------------------------------------------
CREATE TABLE idempotency_key (
    merchant_id     UUID         NOT NULL,
    key             VARCHAR(128) NOT NULL,
    request_hash    VARCHAR(64)  NOT NULL,               -- sha256 of canonical request
    response_status INT,
    response_body   JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    PRIMARY KEY (merchant_id, key)
);
CREATE INDEX idx_idempotency_created ON idempotency_key(created_at);

-- -----------------------------------------------------------------------------
-- Audit log (append-only)
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id              BIGSERIAL    PRIMARY KEY,
    actor_type      VARCHAR(16)  NOT NULL,               -- USER | SYSTEM | WEBHOOK
    actor_id        UUID,
    merchant_id     UUID,
    action          VARCHAR(64)  NOT NULL,               -- ORDER.CREATE, WITHDRAWAL.APPROVE...
    resource_type   VARCHAR(32),
    resource_id     VARCHAR(128),
    request_id      VARCHAR(64),
    ip              INET,
    user_agent      TEXT,
    payload         JSONB,
    result          VARCHAR(16)  NOT NULL,               -- OK | DENIED | ERROR
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_merchant_created ON audit_log(merchant_id, created_at DESC);
CREATE INDEX idx_audit_action_created   ON audit_log(action, created_at DESC);

-- audit_log is append-only — block UPDATE / DELETE.
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_log_no_update BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE TRIGGER trg_audit_log_no_delete BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
