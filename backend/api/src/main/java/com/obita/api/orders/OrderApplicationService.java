package com.obita.api.orders;

import com.obita.api.orders.dto.CreateOrderRequest;
import com.obita.api.orders.dto.CreateRefundRequest;
import com.obita.common.audit.Audited;
import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;
import com.obita.common.id.IdGenerator;
import com.obita.common.money.Money;
import com.obita.common.tenancy.MerchantId;
import com.obita.common.tenancy.Principal;
import com.obita.domain.account.AccountRepository;
import com.obita.domain.account.AccountType;
import com.obita.domain.account.LedgerPostingService;
import com.obita.domain.account.LedgerTxType;
import com.obita.domain.orders.Order;
import com.obita.domain.orders.OrderEvent;
import com.obita.domain.orders.OrderRefund;
import com.obita.domain.orders.OrderRepository;
import com.obita.domain.orders.OrderStatus;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Orders application service.
 *
 * Each public method is a single business transaction — DB tx wraps:
 *   1. Optional ledger post (via {@link LedgerPostingService}).
 *   2. Aggregate state change.
 *   3. Persisted append-only event row.
 *   4. Audit log row (via {@code @Audited} AOP).
 *
 * The controller drives idempotency via {@code @Idempotent} on the matching
 * endpoint method.
 */
@Service
public class OrderApplicationService {

    private static final Logger log = LoggerFactory.getLogger(OrderApplicationService.class);

    private final OrderRepository orders;
    private final AccountRepository accounts;
    private final LedgerPostingService posting;

    public OrderApplicationService(OrderRepository orders,
                                   AccountRepository accounts,
                                   LedgerPostingService posting) {
        this.orders = orders;
        this.accounts = accounts;
        this.posting = posting;
    }

    // ------------------------------------------------------------------
    // Create
    // ------------------------------------------------------------------

    @Transactional
    @Audited(action = "ORDER.CREATE", resourceType = "ORDER")
    public Order create(Principal actor, CreateOrderRequest req) {
        var existing = orders.findByMerchantOrderNo(actor.merchantId(), req.merchantOrderNo());
        if (existing.isPresent()) {
            // We could simply return the existing order for idempotent re-tries,
            // but that's the job of the Idempotency-Key advice. Reuse of
            // merchantOrderNo with a different intent is an error.
            throw new BusinessException(ErrorCode.ORDER_DUPLICATE_NO,
                "merchantOrderNo already used")
                .with("merchantOrderNo", req.merchantOrderNo());
        }

        var order = Order.create(
            actor.merchantId(),
            req.merchantOrderNo(),
            Money.of(req.quoteAsset(), req.quoteAmount()),
            req.settleAsset()  == null ? null : Money.of(req.settleAsset(),  req.settleAmount()),
            req.feeAsset()     == null ? null : Money.of(req.feeAsset(),     req.feeAmount() == null ? BigDecimal.ZERO : req.feeAmount()),
            req.paymentChannel(),
            req.payerReference(),
            req.expiresAt(),
            req.description()
        );
        orders.insert(order);
        appendEvent(order, null, OrderStatus.CREATED, actor, "create");

        // Move straight to PENDING_PAYMENT — the merchant is signalling intent
        // to accept payment by creating the order.
        order.submit();
        if (orders.update(order, order.version() - 1) != 1) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, "stale order at submit");
        }
        appendEvent(order, OrderStatus.CREATED, OrderStatus.PENDING_PAYMENT, actor, "submit");

        log.info("order.created merchantId={} orderId={} no={}",
            actor.merchantId(), order.id(), order.merchantOrderNo());
        return order;
    }

    // ------------------------------------------------------------------
    // Mark paid (called by webhooks / admin)
    // ------------------------------------------------------------------

    @Transactional
    @Audited(action = "ORDER.MARK_PAID", resourceType = "ORDER")
    public Order markPaid(Principal actor, UUID orderId, String reason) {
        var order = mustLock(actor.merchantId(), orderId);
        var prev = order.status();
        order.markPaid();
        if (orders.update(order, order.version() - 1) != 1) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, "stale order at markPaid");
        }
        appendEvent(order, prev, order.status(), actor, reason);
        return order;
    }

    // ------------------------------------------------------------------
    // Settle — posts to ledger and transitions PAID → SETTLED
    // ------------------------------------------------------------------

    @Transactional
    @Audited(action = "ORDER.SETTLE", resourceType = "ORDER")
    public Order settle(Principal actor, UUID orderId) {
        var order = mustLock(actor.merchantId(), orderId);
        if (order.status() != OrderStatus.PAID) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATE,
                "settle requires PAID status, got " + order.status())
                .with("currentStatus", order.status().name());
        }
        var settle = order.settleAmount().orElseThrow(() ->
            new BusinessException(ErrorCode.ORDER_INVALID_STATE, "missing settle amount"));

        var available = mustAccount(actor.merchantId(), AccountType.AVAILABLE, settle.asset().value());
        var settlement = mustAccount(actor.merchantId(), AccountType.SETTLEMENT, settle.asset().value());

        var tx = posting.postTransfer(
            actor.merchantId(),
            LedgerTxType.ORDER_SETTLE,
            available, settlement,
            settle,
            "ORDER", order.id(), "settle order " + order.merchantOrderNo()
        );

        var prev = order.status();
        order.markSettled(tx.id());
        if (orders.update(order, order.version() - 1) != 1) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, "stale order at settle");
        }
        appendEvent(order, prev, order.status(), actor, "settle");
        return order;
    }

    // ------------------------------------------------------------------
    // Cancel
    // ------------------------------------------------------------------

    @Transactional
    @Audited(action = "ORDER.CANCEL", resourceType = "ORDER")
    public Order cancel(Principal actor, UUID orderId, String reason) {
        var order = mustLock(actor.merchantId(), orderId);
        var prev = order.status();
        order.cancel(reason);
        if (orders.update(order, order.version() - 1) != 1) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, "stale order at cancel");
        }
        appendEvent(order, prev, order.status(), actor, "cancel: " + (reason == null ? "n/a" : reason));
        return order;
    }

    // ------------------------------------------------------------------
    // Refund
    // ------------------------------------------------------------------

    @Transactional
    @Audited(action = "ORDER.REFUND_REQUEST", resourceType = "ORDER")
    public OrderRefund requestRefund(Principal actor, UUID orderId, CreateRefundRequest req) {
        var order = mustLock(actor.merchantId(), orderId);
        if (order.status() != OrderStatus.SETTLED && order.status() != OrderStatus.REFUNDING) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATE,
                "refund requires SETTLED or REFUNDING, got " + order.status());
        }
        var settle = order.settleAmount().orElseThrow(() ->
            new BusinessException(ErrorCode.ORDER_INVALID_STATE, "no settle amount on order"));
        // sum of completed refunds + this refund must not exceed settle_amount.
        BigDecimal alreadyRefunded = orders.listRefunds(order.id()).stream()
            .filter(r -> "COMPLETED".equals(r.status()))
            .map(r -> r.amount().amount())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        var remaining = settle.amount().subtract(alreadyRefunded);
        if (req.amount().compareTo(remaining) > 0) {
            throw new BusinessException(ErrorCode.ORDER_REFUND_EXCEEDS_SETTLED,
                "refund " + req.amount() + " exceeds remaining " + remaining)
                .with("alreadyRefunded", alreadyRefunded.toPlainString())
                .with("remaining",       remaining.toPlainString());
        }

        // Move the order to REFUNDING if currently SETTLED.
        if (order.status() == OrderStatus.SETTLED) {
            order.enterRefunding();
            if (orders.update(order, order.version() - 1) != 1) {
                throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, "stale order at refund");
            }
            appendEvent(order, OrderStatus.SETTLED, OrderStatus.REFUNDING, actor, "refund requested");
        }

        var refundMoney = Money.of(settle.asset(), req.amount());
        var settlement  = mustAccount(actor.merchantId(), AccountType.SETTLEMENT, settle.asset().value());
        var available   = mustAccount(actor.merchantId(), AccountType.AVAILABLE,  settle.asset().value());

        var tx = posting.postTransfer(
            actor.merchantId(),
            LedgerTxType.REFUND,
            settlement, available,                                 // reverse of settle
            refundMoney,
            "ORDER", order.id(), "refund order " + order.merchantOrderNo()
        );

        var refund = new OrderRefund(
            IdGenerator.newId(), order.id(), refundMoney,
            req.reason() == null ? "" : req.reason(),
            "COMPLETED",
            java.util.Optional.of(tx.id()),
            actor.userId(),
            Instant.now(),
            java.util.Optional.of(Instant.now())
        );
        orders.insertRefund(refund);

        // Decide whether the refund fully closes out the settled amount.
        boolean fullyRefunded = alreadyRefunded.add(req.amount()).compareTo(settle.amount()) == 0;
        var prev = order.status();
        order.completeRefund(fullyRefunded, tx.id());
        if (orders.update(order, order.version() - 1) != 1) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, "stale order at refund close");
        }
        appendEvent(order, prev, order.status(), actor, fullyRefunded ? "refund completed" : "partial refund");

        return refund;
    }

    // ------------------------------------------------------------------
    // Reads
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Order get(Principal actor, UUID orderId) {
        return orders.findById(actor.merchantId(), orderId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND, "order not found"));
    }

    @Transactional(readOnly = true)
    public Order getByNo(Principal actor, String merchantOrderNo) {
        return orders.findByMerchantOrderNo(actor.merchantId(), merchantOrderNo)
            .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND, "order not found"));
    }

    @Transactional(readOnly = true)
    public List<Order> list(Principal actor, OrderRepository.ListFilters f, int limit,
                            Instant beforeCreatedAt, UUID beforeId) {
        return orders.list(actor.merchantId(), f, limit, beforeCreatedAt, beforeId);
    }

    @Transactional(readOnly = true)
    public List<OrderEvent> events(Principal actor, UUID orderId) {
        // Ensure access by merchant scope first.
        get(actor, orderId);
        return orders.eventsForOrder(orderId);
    }

    @Transactional(readOnly = true)
    public List<OrderRefund> refunds(Principal actor, UUID orderId) {
        get(actor, orderId);
        return orders.listRefunds(orderId);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private Order mustLock(MerchantId merchant, UUID orderId) {
        return orders.lockById(merchant, orderId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND, "order not found"));
    }

    private UUID mustAccount(MerchantId merchant, AccountType type, String assetCode) {
        return accounts.findOne(merchant, type, com.obita.common.money.AssetCode.of(assetCode))
            .map(a -> a.id())
            .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND,
                "account not found: " + type + " / " + assetCode));
    }

    private void appendEvent(Order order, OrderStatus from, OrderStatus to, Principal actor, String reason) {
        orders.appendEvent(new OrderEvent(
            null,
            order.id(),
            from,
            to,
            actor == null ? "SYSTEM" : "USER",
            actor == null ? null : actor.userId(),
            reason,
            null,
            Instant.now()
        ));
    }
}
