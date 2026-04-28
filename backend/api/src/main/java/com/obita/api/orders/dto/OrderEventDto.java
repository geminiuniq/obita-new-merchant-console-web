package com.obita.api.orders.dto;

import com.obita.domain.orders.OrderEvent;
import com.obita.domain.orders.OrderStatus;

import java.time.Instant;
import java.util.UUID;

public record OrderEventDto(
    Long id,
    UUID orderId,
    OrderStatus fromStatus,
    OrderStatus toStatus,
    String actorType,
    UUID actorId,
    String reason,
    Instant createdAt
) {
    public static OrderEventDto from(OrderEvent e) {
        return new OrderEventDto(e.id(), e.orderId(), e.fromStatus(), e.toStatus(),
            e.actorType(), e.actorId(), e.reason(), e.createdAt());
    }
}
