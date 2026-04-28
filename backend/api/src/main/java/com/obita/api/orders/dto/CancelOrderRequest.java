package com.obita.api.orders.dto;

import jakarta.validation.constraints.Size;

public record CancelOrderRequest(@Size(max = 64) String reason) {}
