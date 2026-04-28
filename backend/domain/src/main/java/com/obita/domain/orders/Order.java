package com.obita.domain.orders;

import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;
import com.obita.common.id.IdGenerator;
import com.obita.common.money.Money;
import com.obita.common.tenancy.MerchantId;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Order aggregate. Mutable in memory because the lifecycle is naturally a
 * mutation; persistence is a snapshot per {@code save()}. State transitions
 * go through {@link #transition(OrderStatus, String)} so the rules in
 * {@link OrderStatus#canTransitionTo(OrderStatus)} are honoured.
 *
 * Optimistic locking: every successful mutation bumps {@link #version()};
 * the repository uses it in the {@code WHERE version = ?} clause.
 */
public class Order {

    private final UUID id;
    private final MerchantId merchantId;
    private final String merchantOrderNo;
    private OrderStatus status;
    private final Money quoteAmount;
    private final Optional<Money> settleAmount;
    private final Optional<Money> feeAmount;
    private final Optional<PaymentChannel> paymentChannel;
    private final Optional<String> payerReference;
    private final Optional<Instant> expiresAt;
    private Optional<Instant> paidAt;
    private Optional<Instant> settledAt;
    private Optional<Instant> cancelledAt;
    private final String description;
    private Optional<UUID> settlementTxId;
    private Optional<UUID> refundTxId;
    private final Instant createdAt;
    private Instant updatedAt;
    private int version;

    /** Factory for new orders. Status starts at {@link OrderStatus#CREATED}. */
    public static Order create(
        MerchantId merchantId,
        String merchantOrderNo,
        Money quoteAmount,
        Money settleAmount,
        Money feeAmount,
        PaymentChannel paymentChannel,
        String payerReference,
        Instant expiresAt,
        String description
    ) {
        Objects.requireNonNull(merchantId, "merchantId");
        Objects.requireNonNull(merchantOrderNo, "merchantOrderNo");
        Objects.requireNonNull(quoteAmount, "quoteAmount");
        if (!quoteAmount.isPositive()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "quoteAmount must be positive");
        }
        if (paymentChannel == PaymentChannel.CRYPTO && expiresAt == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                "CRYPTO orders require expiresAt");
        }

        var now = Instant.now();
        return new Order(
            IdGenerator.newId(),
            merchantId,
            merchantOrderNo,
            OrderStatus.CREATED,
            quoteAmount,
            Optional.ofNullable(settleAmount),
            Optional.ofNullable(feeAmount),
            Optional.ofNullable(paymentChannel),
            Optional.ofNullable(payerReference),
            Optional.ofNullable(expiresAt),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            description,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            0
        );
    }

    /** Rehydration constructor — used by the repository when loading from DB. */
    public Order(
        UUID id,
        MerchantId merchantId,
        String merchantOrderNo,
        OrderStatus status,
        Money quoteAmount,
        Optional<Money> settleAmount,
        Optional<Money> feeAmount,
        Optional<PaymentChannel> paymentChannel,
        Optional<String> payerReference,
        Optional<Instant> expiresAt,
        Optional<Instant> paidAt,
        Optional<Instant> settledAt,
        Optional<Instant> cancelledAt,
        String description,
        Optional<UUID> settlementTxId,
        Optional<UUID> refundTxId,
        Instant createdAt,
        Instant updatedAt,
        int version
    ) {
        this.id              = id;
        this.merchantId      = merchantId;
        this.merchantOrderNo = merchantOrderNo;
        this.status          = status;
        this.quoteAmount     = quoteAmount;
        this.settleAmount    = settleAmount;
        this.feeAmount       = feeAmount;
        this.paymentChannel  = paymentChannel;
        this.payerReference  = payerReference;
        this.expiresAt       = expiresAt;
        this.paidAt          = paidAt;
        this.settledAt       = settledAt;
        this.cancelledAt     = cancelledAt;
        this.description     = description;
        this.settlementTxId  = settlementTxId;
        this.refundTxId      = refundTxId;
        this.createdAt       = createdAt;
        this.updatedAt       = updatedAt;
        this.version         = version;
    }

    // ---- state transitions

    /** Generic transition guard. Concrete transitions also set side fields below. */
    void transition(OrderStatus target, String reason) {
        if (!status.canTransitionTo(target)) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATE,
                "cannot transition order from " + status + " to " + target)
                .with("orderId", id)
                .with("currentStatus", status.name())
                .with("targetStatus", target.name())
                .with("reason", reason);
        }
        this.status = target;
        this.updatedAt = Instant.now();
        this.version++;
    }

    public void submit() {
        transition(OrderStatus.PENDING_PAYMENT, "submit");
    }

    public void markPaid() {
        transition(OrderStatus.PAID, "payment confirmed");
        this.paidAt = Optional.of(Instant.now());
    }

    public void markSettled(UUID ledgerTxId) {
        Objects.requireNonNull(ledgerTxId, "ledgerTxId");
        transition(OrderStatus.SETTLED, "settle");
        this.settlementTxId = Optional.of(ledgerTxId);
        this.settledAt = Optional.of(Instant.now());
    }

    public void cancel(String reason) {
        if (status != OrderStatus.CREATED && status != OrderStatus.PENDING_PAYMENT && status != OrderStatus.PAID) {
            throw new BusinessException(ErrorCode.ORDER_INVALID_STATE,
                "cannot cancel order in status " + status)
                .with("currentStatus", status.name());
        }
        transition(OrderStatus.CANCELLED, reason);
        this.cancelledAt = Optional.of(Instant.now());
    }

    public void enterRefunding() {
        transition(OrderStatus.REFUNDING, "refund requested");
    }

    public void completeRefund(boolean fullyRefunded, UUID refundTxId) {
        if (fullyRefunded) {
            transition(OrderStatus.REFUNDED, "fully refunded");
        } else {
            // partial refund — back to SETTLED
            transition(OrderStatus.SETTLED, "partially refunded");
        }
        this.refundTxId = Optional.of(refundTxId);
    }

    /** Domain rule: an order is expired iff CRYPTO + past expiresAt + still pending. */
    public boolean isExpired(Instant now) {
        return paymentChannel.orElse(null) == PaymentChannel.CRYPTO
            && expiresAt.isPresent()
            && now.isAfter(expiresAt.get())
            && (status == OrderStatus.CREATED || status == OrderStatus.PENDING_PAYMENT);
    }

    // ---- getters
    public UUID id()                                  { return id; }
    public MerchantId merchantId()                    { return merchantId; }
    public String merchantOrderNo()                   { return merchantOrderNo; }
    public OrderStatus status()                       { return status; }
    public Money quoteAmount()                        { return quoteAmount; }
    public Optional<Money> settleAmount()             { return settleAmount; }
    public Optional<Money> feeAmount()                { return feeAmount; }
    public Optional<PaymentChannel> paymentChannel()  { return paymentChannel; }
    public Optional<String> payerReference()          { return payerReference; }
    public Optional<Instant> expiresAt()              { return expiresAt; }
    public Optional<Instant> paidAt()                 { return paidAt; }
    public Optional<Instant> settledAt()              { return settledAt; }
    public Optional<Instant> cancelledAt()            { return cancelledAt; }
    public String description()                       { return description; }
    public Optional<UUID> settlementTxId()            { return settlementTxId; }
    public Optional<UUID> refundTxId()                { return refundTxId; }
    public Instant createdAt()                        { return createdAt; }
    public Instant updatedAt()                        { return updatedAt; }
    public int version()                              { return version; }
}
