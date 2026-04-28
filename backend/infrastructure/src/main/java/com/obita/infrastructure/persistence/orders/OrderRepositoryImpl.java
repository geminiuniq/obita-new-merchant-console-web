package com.obita.infrastructure.persistence.orders;

import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;
import com.obita.common.tenancy.MerchantId;
import com.obita.domain.orders.Order;
import com.obita.domain.orders.OrderEvent;
import com.obita.domain.orders.OrderRefund;
import com.obita.domain.orders.OrderRepository;
import com.obita.domain.orders.OrderStatus;
import com.obita.domain.orders.PaymentChannel;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class OrderRepositoryImpl implements OrderRepository {

    private final OrderMapper mapper;

    public OrderRepositoryImpl(OrderMapper mapper) { this.mapper = mapper; }

    @Override public void insert(Order order) {
        try {
            mapper.insert(OrderRowMapper.fromDomain(order));
        } catch (DuplicateKeyException dup) {
            throw new BusinessException(ErrorCode.ORDER_DUPLICATE_NO,
                "merchantOrderNo already used: " + order.merchantOrderNo())
                .with("merchantOrderNo", order.merchantOrderNo());
        }
    }

    @Override public int update(Order order, int expectedVersion) {
        return mapper.updateWithVersion(OrderRowMapper.fromDomain(order), expectedVersion);
    }

    @Override public Optional<Order> lockById(MerchantId merchant, UUID id) {
        var row = mapper.selectByIdForUpdate(merchant.value(), id);
        return Optional.ofNullable(row).map(OrderRowMapper::toDomain);
    }

    @Override public Optional<Order> findById(MerchantId merchant, UUID id) {
        return Optional.ofNullable(mapper.selectById(merchant.value(), id))
            .map(OrderRowMapper::toDomain);
    }

    @Override public Optional<Order> findByMerchantOrderNo(MerchantId merchant, String no) {
        return Optional.ofNullable(mapper.selectByMerchantOrderNo(merchant.value(), no))
            .map(OrderRowMapper::toDomain);
    }

    @Override public List<Order> list(MerchantId merchant, ListFilters f, int limit,
                                      Instant beforeCreatedAt, UUID beforeId) {
        var rows = mapper.list(
            merchant.value(),
            f.status() == null  ? null : f.status().name(),
            f.channel() == null ? null : f.channel().name(),
            f.from(), f.to(),
            limit, beforeCreatedAt, beforeId
        );
        return rows.stream().map(OrderRowMapper::toDomain).toList();
    }

    @Override public List<Order> findExpiredCandidates(Instant now, int limit) {
        return mapper.selectExpiredCandidates(now, limit).stream()
            .map(OrderRowMapper::toDomain).toList();
    }

    @Override public void appendEvent(OrderEvent e) {
        mapper.insertEvent(
            e.orderId(),
            e.fromStatus() == null ? null : e.fromStatus().name(),
            e.toStatus().name(),
            e.actorType(),
            e.actorId(),
            e.reason(),
            e.payloadJson()
        );
    }

    @Override public List<OrderEvent> eventsForOrder(UUID orderId) {
        return mapper.selectEvents(orderId).stream()
            .map(OrderRowMapper::toDomainEvent).toList();
    }

    @Override public void insertRefund(OrderRefund refund) {
        var r = new RefundRow();
        r.id            = refund.id();
        r.orderId       = refund.orderId();
        r.amount        = refund.amount().amount();
        r.assetCode     = refund.amount().asset().value();
        r.reason        = refund.reason();
        r.status        = refund.status();
        r.ledgerTxId    = refund.ledgerTxId().orElse(null);
        r.requestedBy   = refund.requestedBy();
        r.requestedAt   = refund.requestedAt();
        r.completedAt   = refund.completedAt().orElse(null);
        mapper.insertRefund(r);
    }

    @Override public int updateRefund(OrderRefund refund) {
        var r = new RefundRow();
        r.id           = refund.id();
        r.status       = refund.status();
        r.ledgerTxId   = refund.ledgerTxId().orElse(null);
        r.completedAt  = refund.completedAt().orElse(null);
        return mapper.updateRefund(r);
    }

    @Override public Optional<OrderRefund> findRefundById(UUID id) {
        return Optional.ofNullable(mapper.selectRefund(id))
            .map(OrderRowMapper::toDomainRefund);
    }

    @Override public List<OrderRefund> listRefunds(UUID orderId) {
        return mapper.listRefunds(orderId).stream()
            .map(OrderRowMapper::toDomainRefund).toList();
    }
}
