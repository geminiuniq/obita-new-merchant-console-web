-- =============================================================================
-- Orders module
-- An order is a merchant's commercial intent. Settlement happens via the ledger
-- once the cashier or vault confirms the underlying payment.
-- State machine:
--   CREATED -> PENDING_PAYMENT -> PAID -> SETTLED
--                                       -> REFUNDING -> REFUNDED
--                                       \-> DISPUTED
--   any state ----> CANCELLED   (only before PAID)
-- =============================================================================

CREATE TABLE merchant_order (
    id                  UUID         PRIMARY KEY,
    merchant_id         UUID         NOT NULL REFERENCES merchant(id),
    merchant_order_no   VARCHAR(64)  NOT NULL,                 -- merchant-supplied unique ref
    status              VARCHAR(24)  NOT NULL DEFAULT 'CREATED',
    -- amounts: order is *quoted* in quote_asset; settlement may be in settle_asset.
    quote_asset         VARCHAR(32)  NOT NULL REFERENCES asset(asset_code),
    quote_amount        NUMERIC(38,18) NOT NULL CHECK (quote_amount > 0),
    settle_asset        VARCHAR(32)  REFERENCES asset(asset_code),
    settle_amount       NUMERIC(38,18) CHECK (settle_amount IS NULL OR settle_amount > 0),
    fee_asset           VARCHAR(32)  REFERENCES asset(asset_code),
    fee_amount          NUMERIC(38,18) CHECK (fee_amount IS NULL OR fee_amount >= 0),
    -- payer & channel
    payment_channel     VARCHAR(32),                            -- CRYPTO | FIAT_BANK | FIAT_CARD | INTERNAL
    payer_reference     VARCHAR(128),
    -- timing
    expires_at          TIMESTAMPTZ,
    paid_at             TIMESTAMPTZ,
    settled_at          TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    -- bookkeeping
    description         VARCHAR(255),
    metadata            JSONB        NOT NULL DEFAULT '{}'::jsonb,
    settlement_tx_id    UUID         REFERENCES ledger_tx(id),
    refund_tx_id        UUID         REFERENCES ledger_tx(id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             INT          NOT NULL DEFAULT 0,        -- optimistic lock
    UNIQUE (merchant_id, merchant_order_no)
);
CREATE INDEX idx_order_merchant_status_created ON merchant_order(merchant_id, status, created_at DESC);
CREATE INDEX idx_order_status_expires          ON merchant_order(status, expires_at)
    WHERE status IN ('CREATED','PENDING_PAYMENT');

-- Order events: full state transition log (append-only).
CREATE TABLE order_event (
    id              BIGSERIAL    PRIMARY KEY,
    order_id        UUID         NOT NULL REFERENCES merchant_order(id),
    from_status     VARCHAR(24),
    to_status       VARCHAR(24)  NOT NULL,
    actor_type      VARCHAR(16)  NOT NULL,
    actor_id        UUID,
    reason          VARCHAR(64),
    payload         JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_event_order_created ON order_event(order_id, created_at);

-- Refund records (one order may have multiple partial refunds — total <= settle_amount).
CREATE TABLE order_refund (
    id              UUID         PRIMARY KEY,
    order_id        UUID         NOT NULL REFERENCES merchant_order(id),
    amount          NUMERIC(38,18) NOT NULL CHECK (amount > 0),
    asset_code      VARCHAR(32)  NOT NULL REFERENCES asset(asset_code),
    reason          VARCHAR(255),
    status          VARCHAR(24)  NOT NULL DEFAULT 'REQUESTED', -- REQUESTED | PROCESSING | COMPLETED | FAILED
    ledger_tx_id    UUID         REFERENCES ledger_tx(id),
    requested_by    UUID,
    requested_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);
CREATE INDEX idx_refund_order ON order_refund(order_id);
