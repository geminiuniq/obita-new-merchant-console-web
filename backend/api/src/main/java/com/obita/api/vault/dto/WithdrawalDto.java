package com.obita.api.vault.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.obita.common.money.AssetCode;
import com.obita.domain.chain.ChainId;
import com.obita.domain.vault.Withdrawal;
import com.obita.domain.vault.WithdrawalStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record WithdrawalDto(
    UUID id,
    ChainId chainId,
    AssetCode asset,
    BigDecimal amount,
    BigDecimal feeAmount,
    String toAddress,
    WithdrawalStatus status,
    String txHash,
    Long blockNumber,
    int confirmations,
    Integer riskScore,
    String riskNote,
    UUID requestedBy,
    UUID approvedBy,
    Instant requestedAt,
    Instant submittedAt,
    Instant completedAt,
    String failureCode,
    String failureMessage,
    int version
) {
    public static WithdrawalDto from(Withdrawal w) {
        return new WithdrawalDto(
            w.id(), w.chainId(), w.amount().asset(),
            w.amount().amount(), w.feeAmount().amount(),
            w.toAddress().value(), w.status(),
            w.txHash().orElse(null), w.blockNumber().orElse(null), w.confirmations(),
            w.riskScore().orElse(null), w.riskNote().orElse(null),
            w.requestedBy(), w.approvedBy().orElse(null),
            w.requestedAt(), w.submittedAt().orElse(null), w.completedAt().orElse(null),
            w.failureCode().orElse(null), w.failureMessage().orElse(null),
            w.version()
        );
    }
}
