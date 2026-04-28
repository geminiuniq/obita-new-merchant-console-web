package com.obita.infrastructure.persistence.vault;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;


@Data
public class DepositRow {
    public UUID id;
    public UUID merchantId;
    public String chainId;
    public String assetCode;
    public UUID walletAddressId;
    public String fromAddress;
    public String toAddress;
    public String txHash;
    public Integer logIndex;
    public Long blockNumber;
    public BigDecimal amount;
    public Integer confirmations;
    public String status;
    public UUID ledgerTxId;
    public Instant detectedAt;
    public Instant creditedAt;
    public String rawPayload;
}
