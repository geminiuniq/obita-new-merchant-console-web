package com.obita.api.vault.dto;

import com.obita.common.money.AssetCode;
import com.obita.domain.chain.ChainId;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CreateWithdrawalRequest(
    @NotNull ChainId chainId,
    @NotNull AssetCode asset,
    @NotNull @Positive BigDecimal amount,
    @Positive BigDecimal feeAmount,
    @NotBlank String toAddress
) {}
