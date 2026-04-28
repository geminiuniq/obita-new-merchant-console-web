package com.obita.infrastructure.persistence.account;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Projection: account row + its latest balance_after from the ledger. */
@Data
public class AccountWithBalanceRow {
    public UUID id;
    public UUID merchantId;
    public String accountType;
    public String assetCode;
    public String status;
    public BigDecimal balance;
    public Instant createdAt;
}
