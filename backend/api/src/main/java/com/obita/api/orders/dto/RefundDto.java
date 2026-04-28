package com.obita.api.orders.dto;

import com.obita.common.money.AssetCode;
import com.obita.domain.orders.OrderRefund;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RefundDto(
    UUID id,
    UUID orderId,
    AssetCode asset,
    BigDecimal amount,
    String reason,
    String status,
    UUID ledgerTxId,
    UUID requestedBy,
    Instant requestedAt,
    Instant completedAt
) {
    public static RefundDto from(OrderRefund r) {
        return new RefundDto(
            r.id(), r.orderId(),
            r.amount().asset(), r.amount().amount(),
            r.reason(), r.status(),
            r.ledgerTxId().orElse(null),
            r.requestedBy(),
            r.requestedAt(),
            r.completedAt().orElse(null)
        );
    }
}
