package com.obita.infrastructure.persistence.account;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;


@Data
public class LedgerTxRow {
    public UUID id;
    public UUID merchantId;
    public String txType;
    public String referenceType;
    public UUID referenceId;
    public String memo;
    public Instant createdAt;
}
