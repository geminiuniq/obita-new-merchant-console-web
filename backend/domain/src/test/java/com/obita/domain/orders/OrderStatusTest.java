package com.obita.domain.orders;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OrderStatusTest {

    @Test void allowedTransitions() {
        assertThat(OrderStatus.CREATED.canTransitionTo(OrderStatus.PENDING_PAYMENT)).isTrue();
        assertThat(OrderStatus.PENDING_PAYMENT.canTransitionTo(OrderStatus.PAID)).isTrue();
        assertThat(OrderStatus.PAID.canTransitionTo(OrderStatus.SETTLED)).isTrue();
        assertThat(OrderStatus.SETTLED.canTransitionTo(OrderStatus.REFUNDING)).isTrue();
        assertThat(OrderStatus.REFUNDING.canTransitionTo(OrderStatus.REFUNDED)).isTrue();
        assertThat(OrderStatus.REFUNDING.canTransitionTo(OrderStatus.SETTLED)).isTrue();    // partial refund
    }

    @Test void disallowedTransitions() {
        assertThat(OrderStatus.SETTLED.canTransitionTo(OrderStatus.CANCELLED)).isFalse();
        assertThat(OrderStatus.REFUNDED.canTransitionTo(OrderStatus.SETTLED)).isFalse();
        assertThat(OrderStatus.CANCELLED.canTransitionTo(OrderStatus.PAID)).isFalse();
    }

    @Test void terminalsAreTerminal() {
        assertThat(OrderStatus.REFUNDED.isTerminal()).isTrue();
        assertThat(OrderStatus.CANCELLED.isTerminal()).isTrue();
        assertThat(OrderStatus.SETTLED.isTerminal()).isFalse();
    }
}
