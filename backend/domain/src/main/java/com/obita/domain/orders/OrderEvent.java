package com.obita.domain.orders;

import java.time.Instant;
import java.util.UUID;

/** Append-only state-transition log row. */
public record OrderEvent(
    Long id,                       // BIGSERIAL; null until persisted
    UUID orderId,
    OrderStatus fromStatus,        // null on initial create
    OrderStatus toStatus,
    String actorType,              // USER | SYSTEM | WEBHOOK
    UUID actorId,
    String reason,
    String payloadJson,            // optional, raw JSON for context
    Instant createdAt
) {}
