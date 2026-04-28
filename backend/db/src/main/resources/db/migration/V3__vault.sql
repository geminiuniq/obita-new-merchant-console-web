-- =============================================================================
-- Vault module — multi-chain wallet addresses, deposits, withdrawals.
-- Key principle: this layer talks to CustodyProvider through an interface;
-- the only persisted secret is custody_ref (a string the provider understands).
-- We NEVER store private keys in the DB.
-- =============================================================================

-- Wallet addresses owned by a merchant on a given chain.
-- For mock provider: derived from an in-memory HD wallet.
-- For Cobo/Safeheron: custody_ref is their wallet/sub-account id.
CREATE TABLE wallet_address (
    id              UUID         PRIMARY KEY,
    merchant_id     UUID         NOT NULL REFERENCES merchant(id),
    chain_id        VARCHAR(32)  NOT NULL REFERENCES chain(chain_id),
    address         VARCHAR(128) NOT NULL,
    custody_ref     VARCHAR(255) NOT NULL,                -- opaque identifier from provider
    label           VARCHAR(64),
    purpose         VARCHAR(24)  NOT NULL DEFAULT 'DEPOSIT',  -- DEPOSIT | SETTLEMENT | HOT
    status          VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (chain_id, address)
);
CREATE INDEX idx_wallet_merchant_chain ON wallet_address(merchant_id, chain_id);

-- Chain scanner cursor — last block we've processed per chain.
CREATE TABLE chain_cursor (
    chain_id        VARCHAR(32)  PRIMARY KEY REFERENCES chain(chain_id),
    last_block      BIGINT       NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Deposits — observed credits to our wallet addresses.
-- Lifecycle:
--   DETECTED -> CONFIRMING (wait for N confirmations)
--                  -> CREDITED (ledger entry posted)
--                  -> REJECTED (reorg / tainted source / amount=0)
CREATE TABLE deposit (
    id                  UUID         PRIMARY KEY,
    merchant_id         UUID         NOT NULL REFERENCES merchant(id),
    chain_id            VARCHAR(32)  NOT NULL REFERENCES chain(chain_id),
    asset_code          VARCHAR(32)  NOT NULL REFERENCES asset(asset_code),
    wallet_address_id   UUID         NOT NULL REFERENCES wallet_address(id),
    from_address        VARCHAR(128),
    to_address          VARCHAR(128) NOT NULL,
    tx_hash             VARCHAR(128) NOT NULL,
    log_index           INT          NOT NULL DEFAULT 0,
    block_number        BIGINT,
    amount              NUMERIC(38,18) NOT NULL CHECK (amount > 0),
    confirmations       INT          NOT NULL DEFAULT 0,
    status              VARCHAR(16)  NOT NULL DEFAULT 'DETECTED',
    ledger_tx_id        UUID         REFERENCES ledger_tx(id),
    detected_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    credited_at         TIMESTAMPTZ,
    raw_payload         JSONB,
    UNIQUE (chain_id, tx_hash, log_index)
);
CREATE INDEX idx_deposit_merchant_status ON deposit(merchant_id, status);
CREATE INDEX idx_deposit_status_detected ON deposit(status, detected_at);

-- Withdrawals — outbound transfers requested by merchant.
-- Lifecycle:
--   REQUESTED -> RISK_REVIEW -> APPROVED -> SUBMITTED -> CONFIRMING -> COMPLETED
--                                                                  \-> FAILED
--                            \-> REJECTED
CREATE TABLE withdrawal (
    id                  UUID         PRIMARY KEY,
    merchant_id         UUID         NOT NULL REFERENCES merchant(id),
    chain_id            VARCHAR(32)  NOT NULL REFERENCES chain(chain_id),
    asset_code          VARCHAR(32)  NOT NULL REFERENCES asset(asset_code),
    to_address          VARCHAR(128) NOT NULL,
    amount              NUMERIC(38,18) NOT NULL CHECK (amount > 0),
    fee_amount          NUMERIC(38,18) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    status              VARCHAR(24)  NOT NULL DEFAULT 'REQUESTED',
    custody_ref         VARCHAR(255),                          -- provider tx id
    tx_hash             VARCHAR(128),
    block_number        BIGINT,
    confirmations       INT          NOT NULL DEFAULT 0,
    risk_score          INT,
    risk_note           VARCHAR(255),
    requested_by        UUID         REFERENCES app_user(id),
    approved_by         UUID         REFERENCES app_user(id),
    requested_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    submitted_at        TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    ledger_tx_reserve_id UUID        REFERENCES ledger_tx(id),  -- reserves balance at request
    ledger_tx_settle_id  UUID        REFERENCES ledger_tx(id),  -- settles at completion
    failure_code        VARCHAR(64),
    failure_message     TEXT,
    metadata            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    version             INT          NOT NULL DEFAULT 0
);
CREATE INDEX idx_withdrawal_merchant_status ON withdrawal(merchant_id, status);
CREATE INDEX idx_withdrawal_status_requested ON withdrawal(status, requested_at);
