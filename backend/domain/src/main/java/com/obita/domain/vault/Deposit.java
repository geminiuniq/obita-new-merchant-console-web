package com.obita.domain.vault;

import com.obita.common.money.Money;
import com.obita.common.tenancy.MerchantId;
import com.obita.domain.chain.Address;
import com.obita.domain.chain.ChainId;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public record Deposit(
    UUID id,
    MerchantId merchantId,
    ChainId chainId,
    UUID walletAddressId,
    Address fromAddress,
    Address toAddress,
    String txHash,
    int logIndex,
    Long blockNumber,
    Money amount,
    int confirmations,
    DepositStatus status,
    Optional<UUID> ledgerTxId,
    Instant detectedAt,
    Optional<Instant> creditedAt,
    String rawPayloadJson
) {}
