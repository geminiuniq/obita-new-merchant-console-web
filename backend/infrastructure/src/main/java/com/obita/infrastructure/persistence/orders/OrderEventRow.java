package com.obita.infrastructure.persistence.orders;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;


@Data
public class OrderEventRow {
    public Long id;
    public UUID orderId;
    public String fromStatus;
    public String toStatus;
    public String actorType;
    public UUID actorId;
    public String reason;
    public String payload;
    public Instant createdAt;
}
