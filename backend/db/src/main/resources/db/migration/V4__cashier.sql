-- =============================================================================
-- Cashier module — placeholder schema. The application service is not built
-- in MVP; the schema is reserved here so V5 seed data can reference it later.
-- =============================================================================

CREATE TABLE payment_intent (
    id                  UUID         PRIMARY KEY,
    merchant_id         UUID         NOT NULL REFERENCES merchant(id),
    direction           VARCHAR(8)   NOT NULL,                -- IN | OUT
    fiat_asset          VARCHAR(32)  NOT NULL REFERENCES asset(asset_code),
    fiat_amount         NUMERIC(38,18) NOT NULL CHECK (fiat_amount > 0),
    stable_asset        VARCHAR(32)  NOT NULL REFERENCES asset(asset_code),
    stable_amount       NUMERIC(38,18),
    provider            VARCHAR(32)  NOT NULL,                -- mock | circle | banxa | pingpong | ...
    provider_session    VARCHAR(255),
    quote_rate          NUMERIC(38,18),
    quote_expires_at    TIMESTAMPTZ,
    status              VARCHAR(24)  NOT NULL,
    settlement_tx_id    UUID         REFERENCES ledger_tx(id),
    metadata            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             INT          NOT NULL DEFAULT 0
);
CREATE INDEX idx_payment_intent_merchant_status ON payment_intent(merchant_id, status);

CREATE TABLE ramp_transaction (
    id                  UUID         PRIMARY KEY,
    payment_intent_id   UUID         NOT NULL REFERENCES payment_intent(id),
    provider_tx_id      VARCHAR(255),
    status              VARCHAR(24)  NOT NULL,
    raw_payload         JSONB,
    received_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_ramp_transaction_intent ON ramp_transaction(payment_intent_id);

CREATE TABLE settlement_quote (
    id                  UUID         PRIMARY KEY,
    merchant_id         UUID         NOT NULL REFERENCES merchant(id),
    direction           VARCHAR(8)   NOT NULL,
    from_asset          VARCHAR(32)  NOT NULL REFERENCES asset(asset_code),
    to_asset            VARCHAR(32)  NOT NULL REFERENCES asset(asset_code),
    rate                NUMERIC(38,18) NOT NULL,
    valid_until         TIMESTAMPTZ  NOT NULL,
    used                BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
