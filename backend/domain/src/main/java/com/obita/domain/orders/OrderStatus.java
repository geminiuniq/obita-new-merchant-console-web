package com.obita.domain.orders;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Order lifecycle states. The transition table below is the **single source
 * of truth** — any other code that branches on status must consult
 * {@link #canTransitionTo(OrderStatus)}.
 *
 * <pre>
 *   CREATED ─→ PENDING_PAYMENT ─→ PAID ─→ SETTLED ─→ REFUNDING ─→ REFUNDED
 *      │             │              │        │     ╲
 *      └─→ CANCELLED ┘              └→ CANCELLED   ╲→ DISPUTED
 * </pre>
 */
public enum OrderStatus {
    CREATED,
    PENDING_PAYMENT,
    PAID,
    SETTLED,
    REFUNDING,
    REFUNDED,
    CANCELLED,
    DISPUTED;

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = new EnumMap<>(OrderStatus.class);

    static {
        TRANSITIONS.put(CREATED,         EnumSet.of(PENDING_PAYMENT, CANCELLED));
        TRANSITIONS.put(PENDING_PAYMENT, EnumSet.of(PAID, CANCELLED));
        TRANSITIONS.put(PAID,            EnumSet.of(SETTLED, CANCELLED));   // pre-settle cancellation = full refund
        TRANSITIONS.put(SETTLED,         EnumSet.of(REFUNDING, DISPUTED));
        TRANSITIONS.put(REFUNDING,       EnumSet.of(REFUNDED, SETTLED));    // partial refunds return to SETTLED
        TRANSITIONS.put(REFUNDED,        EnumSet.noneOf(OrderStatus.class));
        TRANSITIONS.put(CANCELLED,       EnumSet.noneOf(OrderStatus.class));
        TRANSITIONS.put(DISPUTED,        EnumSet.of(REFUNDING, SETTLED));
    }

    public boolean canTransitionTo(OrderStatus target) {
        return TRANSITIONS.get(this).contains(target);
    }

    public boolean isTerminal() { return TRANSITIONS.get(this).isEmpty(); }
}
