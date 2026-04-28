package com.obita.infrastructure.idempotency;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;


@Data
public class IdempotencyRow {
    public UUID merchantId;
    public String key;
    public String requestHash;
    public Integer responseStatus;
    public String responseBody;
    public Instant createdAt;
    public Instant completedAt;
}
