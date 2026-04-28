package com.obita.domain.account;

import com.obita.common.tenancy.MerchantId;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * One ledger transaction = one logical money event with N balanced entries.
 * Aggregate root for posting flows. Entries are append-only; modifying
 * existing rows is forbidden.
 */
public record LedgerTx(
    UUID id,
    MerchantId merchantId,
    LedgerTxType txType,
    String referenceType,    // ORDER | WITHDRAWAL | DEPOSIT | PAYMENT_INTENT
    UUID referenceId,
    String memo,
    Instant createdAt,
    List<LedgerEntry> entries
) {
    public LedgerTx {
        // Strict invariants checked at construction so the application can never persist
        // an unbalanced tx that the trigger would later reject.
        if (entries == null || entries.isEmpty()) {
            throw new IllegalArgumentException("ledger tx must have at least 2 entries");
        }
        var debit  = entries.stream().filter(e -> e.direction() == Direction.DEBIT)
                            .map(LedgerEntry::amount).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        var credit = entries.stream().filter(e -> e.direction() == Direction.CREDIT)
                            .map(LedgerEntry::amount).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        if (debit.compareTo(credit) != 0) {
            throw new IllegalStateException("unbalanced ledger tx: D=" + debit + " C=" + credit);
        }
    }
}
