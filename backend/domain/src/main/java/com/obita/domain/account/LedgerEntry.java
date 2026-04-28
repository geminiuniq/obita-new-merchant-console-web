package com.obita.domain.account;

import com.obita.common.money.AssetCode;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** One journal line. Append-only; never mutate after persistence. */
public record LedgerEntry(
    Long id,                         // server-assigned BIGSERIAL; null until persisted
    UUID txId,
    UUID accountId,
    AssetCode assetCode,
    Direction direction,
    BigDecimal amount,
    BigDecimal balanceAfter,
    Instant createdAt
) {
    public LedgerEntry {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("amount must be > 0");
        }
        // balance_after MAY be negative for platform contra accounts —
        // see LedgerPostingService.PLATFORM_MERCHANT_ID. Per-account
        // non-negative enforcement is applied at the posting layer.
    }
}
