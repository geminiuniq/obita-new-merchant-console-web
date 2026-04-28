package com.obita.infrastructure.persistence.orders;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Flat MyBatis row mirroring {@code merchant_order}. Maps to/from {@code Order}
 *  via {@link OrderRowMapper#toDomain(OrderRow)} / {@code fromDomain(...)}. */
@TableName("merchant_order")

@Data
public class OrderRow {
    public UUID id;
    public UUID merchantId;
    public String merchantOrderNo;
    public String status;
    public String quoteAsset;
    public BigDecimal quoteAmount;
    public String settleAsset;
    public BigDecimal settleAmount;
    public String feeAsset;
    public BigDecimal feeAmount;
    public String paymentChannel;
    public String payerReference;
    public Instant expiresAt;
    public Instant paidAt;
    public Instant settledAt;
    public Instant cancelledAt;
    public String description;
    public String metadata;            // JSONB cast to text
    public UUID settlementTxId;
    public UUID refundTxId;
    public Instant createdAt;
    public Instant updatedAt;
    public Integer version;
}
