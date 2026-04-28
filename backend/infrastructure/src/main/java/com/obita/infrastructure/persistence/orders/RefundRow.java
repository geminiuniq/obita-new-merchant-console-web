package com.obita.infrastructure.persistence.orders;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;


@Data
public class RefundRow {
    public UUID id;
    public UUID orderId;
    public BigDecimal amount;
    public String assetCode;
    public String reason;
    public String status;
    public UUID ledgerTxId;
    public UUID requestedBy;
    public Instant requestedAt;
    public Instant completedAt;
}
