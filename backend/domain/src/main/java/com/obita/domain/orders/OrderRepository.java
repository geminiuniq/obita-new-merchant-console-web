package com.obita.domain.orders;

import com.obita.common.tenancy.MerchantId;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository {

    /** Insert a new order. Throws on duplicate (merchantId, merchantOrderNo). */
    void insert(Order order);

    /** Update with optimistic-lock on version. Returns rows affected (0 = stale). */
    int update(Order order, int expectedVersion);

    /** Lock + load for state transitions. {@code SELECT ... FOR UPDATE}. */
    Optional<Order> lockById(MerchantId merchant, UUID id);

    Optional<Order> findById(MerchantId merchant, UUID id);
    Optional<Order> findByMerchantOrderNo(MerchantId merchant, String merchantOrderNo);

    /** Cursor-paged listing in descending creation order. */
    List<Order> list(MerchantId merchant, ListFilters filters, int limit, Instant beforeCreatedAt, UUID beforeId);

    /** Pending orders past their expiry — used by the expiry sweeper. */
    List<Order> findExpiredCandidates(Instant now, int limit);

    void appendEvent(OrderEvent event);

    List<OrderEvent> eventsForOrder(UUID orderId);

    void insertRefund(OrderRefund refund);
    int  updateRefund(OrderRefund refund);
    Optional<OrderRefund> findRefundById(UUID id);
    List<OrderRefund> listRefunds(UUID orderId);

    record ListFilters(
        OrderStatus status,
        PaymentChannel channel,
        Instant from,
        Instant to
    ) {}
}
