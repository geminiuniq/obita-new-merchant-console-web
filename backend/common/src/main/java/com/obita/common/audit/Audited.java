package com.obita.common.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an application service method as audited. The {@code AuditAspect}
 * (in infrastructure) writes one {@code audit_log} row per invocation,
 * inside the same DB transaction as the business write.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {
    /** Stable action label, e.g. {@code "ORDER.CREATE"}. */
    String action();

    /** Resource type, e.g. {@code "ORDER"}. Optional — defaults to inferring from return value. */
    String resourceType() default "";
}
