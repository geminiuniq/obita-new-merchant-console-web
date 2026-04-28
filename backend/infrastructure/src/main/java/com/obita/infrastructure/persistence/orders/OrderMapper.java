package com.obita.infrastructure.persistence.orders;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** MyBatis mapper for {@code merchant_order}. Statements live in
 *  {@code resources/mapper/OrderMapper.xml}. */
@Mapper
public interface OrderMapper {

    int insert(OrderRow row);

    /** Optimistic-locked update; returns rows affected. */
    int updateWithVersion(@Param("row") OrderRow row, @Param("expectedVersion") int expectedVersion);

    OrderRow selectByIdForUpdate(@Param("merchantId") UUID merchantId, @Param("id") UUID id);

    OrderRow selectById(@Param("merchantId") UUID merchantId, @Param("id") UUID id);

    OrderRow selectByMerchantOrderNo(@Param("merchantId") UUID merchantId, @Param("no") String no);

    List<OrderRow> list(@Param("merchantId") UUID merchantId,
                        @Param("status") String status,
                        @Param("channel") String channel,
                        @Param("from") Instant from,
                        @Param("to") Instant to,
                        @Param("limit") int limit,
                        @Param("beforeCreatedAt") Instant beforeCreatedAt,
                        @Param("beforeId") UUID beforeId);

    List<OrderRow> selectExpiredCandidates(@Param("now") Instant now, @Param("limit") int limit);

    int insertEvent(@Param("orderId") UUID orderId,
                    @Param("fromStatus") String fromStatus,
                    @Param("toStatus") String toStatus,
                    @Param("actorType") String actorType,
                    @Param("actorId") UUID actorId,
                    @Param("reason") String reason,
                    @Param("payload") String payload);

    List<OrderEventRow> selectEvents(@Param("orderId") UUID orderId);

    int insertRefund(RefundRow row);
    int updateRefund(RefundRow row);
    RefundRow selectRefund(@Param("id") UUID id);
    List<RefundRow> listRefunds(@Param("orderId") UUID orderId);
}
