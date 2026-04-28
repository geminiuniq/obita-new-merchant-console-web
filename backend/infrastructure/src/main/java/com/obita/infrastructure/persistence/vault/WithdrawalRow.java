package com.obita.infrastructure.persistence.vault;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;


@Data
public class WithdrawalRow {
    public UUID id;
    public UUID merchantId;
    public String chainId;
    public String assetCode;
    public String toAddress;
    public BigDecimal amount;
    public BigDecimal feeAmount;
    public String status;
    public String custodyRef;
    public String txHash;
    public Long blockNumber;
    public Integer confirmations;
    public Integer riskScore;
    public String riskNote;
    public UUID requestedBy;
    public UUID approvedBy;
    public Instant requestedAt;
    public Instant submittedAt;
    public Instant completedAt;
    public UUID ledgerTxReserveId;
    public UUID ledgerTxSettleId;
    public String failureCode;
    public String failureMessage;
    public Integer version;
}
