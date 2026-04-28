package com.obita.domain.account;

import com.obita.common.money.AssetCode;
import com.obita.common.tenancy.MerchantId;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Aggregate identity for a logical balance container. Balance itself is
 * derived from {@code ledger_entry}; this row is the addressable handle.
 */
public record Account(
    UUID id,
    MerchantId merchantId,
    AccountType accountType,
    AssetCode assetCode,
    String status,
    Instant createdAt
) {
    /** Convenience for posting code that just needs the latest balance from
     *  the ledger; populated by {@code AccountRepository#loadWithBalance}. */
    public record WithBalance(Account account, BigDecimal balance) {}
}
