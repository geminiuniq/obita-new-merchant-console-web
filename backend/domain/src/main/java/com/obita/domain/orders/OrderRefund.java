package com.obita.domain.orders;

import com.obita.common.money.Money;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public record OrderRefund(
    UUID id,
    UUID orderId,
    Money amount,
    String reason,
    String status,                 // REQUESTED | PROCESSING | COMPLETED | FAILED
    Optional<UUID> ledgerTxId,
    UUID requestedBy,
    Instant requestedAt,
    Optional<Instant> completedAt
) {}
