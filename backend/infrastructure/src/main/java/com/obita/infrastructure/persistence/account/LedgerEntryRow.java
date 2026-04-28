package com.obita.infrastructure.persistence.account;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;


@Data
public class LedgerEntryRow {
    public Long id;
    public UUID txId;
    public UUID accountId;
    public String assetCode;
    public String direction;
    public BigDecimal amount;
    public BigDecimal balanceAfter;
    public Instant createdAt;
}
