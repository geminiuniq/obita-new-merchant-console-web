package com.obita.api.orders.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateRefundRequest(
    @NotNull @Positive BigDecimal amount,
    @Size(max = 255) String reason
) {}
