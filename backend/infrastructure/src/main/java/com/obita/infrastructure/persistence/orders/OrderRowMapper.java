package com.obita.infrastructure.persistence.orders;

import com.obita.common.money.AssetCode;
import com.obita.common.money.Money;
import com.obita.common.tenancy.MerchantId;
import com.obita.domain.orders.Order;
import com.obita.domain.orders.OrderEvent;
import com.obita.domain.orders.OrderRefund;
import com.obita.domain.orders.OrderStatus;
import com.obita.domain.orders.PaymentChannel;

import java.util.Optional;

/** Pure conversion between flat row objects and domain aggregates.
 *  Hand-written rather than MapStruct because the {@code Optional}
 *  unwrapping wants a clear point of inspection. */
public final class OrderRowMapper {

    private OrderRowMapper() {}

    public static Order toDomain(OrderRow r) {
        return new Order(
            r.id,
            MerchantId.of(r.merchantId),
            r.merchantOrderNo,
            OrderStatus.valueOf(r.status),
            Money.of(AssetCode.of(r.quoteAsset), r.quoteAmount),
            r.settleAmount == null ? Optional.empty()
                : Optional.of(Money.of(AssetCode.of(r.settleAsset), r.settleAmount)),
            r.feeAmount == null ? Optional.empty()
                : Optional.of(Money.of(AssetCode.of(r.feeAsset), r.feeAmount)),
            r.paymentChannel == null ? Optional.empty() : Optional.of(PaymentChannel.valueOf(r.paymentChannel)),
            Optional.ofNullable(r.payerReference),
            Optional.ofNullable(r.expiresAt),
            Optional.ofNullable(r.paidAt),
            Optional.ofNullable(r.settledAt),
            Optional.ofNullable(r.cancelledAt),
            r.description,
            Optional.ofNullable(r.settlementTxId),
            Optional.ofNullable(r.refundTxId),
            r.createdAt,
            r.updatedAt,
            r.version == null ? 0 : r.version
        );
    }

    public static OrderRow fromDomain(Order o) {
        var r = new OrderRow();
        r.id              = o.id();
        r.merchantId      = o.merchantId().value();
        r.merchantOrderNo = o.merchantOrderNo();
        r.status          = o.status().name();
        r.quoteAsset      = o.quoteAmount().asset().value();
        r.quoteAmount     = o.quoteAmount().amount();
        o.settleAmount().ifPresent(m -> { r.settleAsset = m.asset().value(); r.settleAmount = m.amount(); });
        o.feeAmount().ifPresent(m    -> { r.feeAsset    = m.asset().value(); r.feeAmount    = m.amount(); });
        r.paymentChannel  = o.paymentChannel().map(Enum::name).orElse(null);
        r.payerReference  = o.payerReference().orElse(null);
        r.expiresAt       = o.expiresAt().orElse(null);
        r.paidAt          = o.paidAt().orElse(null);
        r.settledAt       = o.settledAt().orElse(null);
        r.cancelledAt     = o.cancelledAt().orElse(null);
        r.description     = o.description();
        r.settlementTxId  = o.settlementTxId().orElse(null);
        r.refundTxId      = o.refundTxId().orElse(null);
        r.createdAt       = o.createdAt();
        r.updatedAt       = o.updatedAt();
        r.version         = o.version();
        return r;
    }

    public static OrderEvent toDomainEvent(OrderEventRow r) {
        return new OrderEvent(
            r.id,
            r.orderId,
            r.fromStatus == null ? null : OrderStatus.valueOf(r.fromStatus),
            OrderStatus.valueOf(r.toStatus),
            r.actorType,
            r.actorId,
            r.reason,
            r.payload,
            r.createdAt
        );
    }

    public static OrderRefund toDomainRefund(RefundRow r) {
        return new OrderRefund(
            r.id, r.orderId,
            Money.of(AssetCode.of(r.assetCode), r.amount),
            r.reason, r.status,
            Optional.ofNullable(r.ledgerTxId),
            r.requestedBy,
            r.requestedAt,
            Optional.ofNullable(r.completedAt)
        );
    }
}
