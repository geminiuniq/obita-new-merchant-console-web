package com.obita.common.idempotency;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method as requiring an {@code Idempotency-Key} header.
 * The advice in infrastructure handles deduplication via the {@code idempotency_key}
 * table.
 *
 * Apply to every {@code POST}/{@code PATCH}/{@code DELETE} that creates, updates,
 * or moves money. Read endpoints don't need it.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {
    /** TTL in seconds for the cached response. Default 24h. */
    long ttlSeconds() default 86400;
}
