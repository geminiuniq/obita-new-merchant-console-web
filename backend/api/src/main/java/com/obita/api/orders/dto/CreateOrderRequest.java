package com.obita.api.orders.dto;

import com.obita.common.money.AssetCode;
import com.obita.domain.orders.PaymentChannel;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public record CreateOrderRequest(
    @NotBlank @Size(max = 64) String merchantOrderNo,

    @NotNull AssetCode quoteAsset,
    @NotNull @Positive BigDecimal quoteAmount,

    AssetCode settleAsset,
    @Positive BigDecimal settleAmount,

    AssetCode feeAsset,
    BigDecimal feeAmount,

    PaymentChannel paymentChannel,
    @Size(max = 128) String payerReference,
    Instant expiresAt,

    @Size(max = 255) String description
) {}
