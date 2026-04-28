package com.obita.api.orders.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.obita.common.money.AssetCode;
import com.obita.domain.orders.Order;
import com.obita.domain.orders.OrderStatus;
import com.obita.domain.orders.PaymentChannel;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Wire shape for an order. Money fields go out as plain decimal strings to
 *  avoid JS float precision; the asset_code is reported alongside. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OrderDto(
    UUID id,
    String merchantOrderNo,
    OrderStatus status,
    AssetCode quoteAsset,
    BigDecimal quoteAmount,
    AssetCode settleAsset,
    BigDecimal settleAmount,
    AssetCode feeAsset,
    BigDecimal feeAmount,
    PaymentChannel paymentChannel,
    String payerReference,
    Instant expiresAt,
    Instant paidAt,
    Instant settledAt,
    Instant cancelledAt,
    String description,
    UUID settlementTxId,
    UUID refundTxId,
    Instant createdAt,
    Instant updatedAt,
    int version
) {
    public static OrderDto from(Order o) {
        return new OrderDto(
            o.id(), o.merchantOrderNo(), o.status(),
            o.quoteAmount().asset(),
            o.quoteAmount().amount(),
            o.settleAmount().map(m -> m.asset()).orElse(null),
            o.settleAmount().map(m -> m.amount()).orElse(null),
            o.feeAmount().map(m -> m.asset()).orElse(null),
            o.feeAmount().map(m -> m.amount()).orElse(null),
            o.paymentChannel().orElse(null),
            o.payerReference().orElse(null),
            o.expiresAt().orElse(null),
            o.paidAt().orElse(null),
            o.settledAt().orElse(null),
            o.cancelledAt().orElse(null),
            o.description(),
            o.settlementTxId().orElse(null),
            o.refundTxId().orElse(null),
            o.createdAt(),
            o.updatedAt(),
            o.version()
        );
    }
}
