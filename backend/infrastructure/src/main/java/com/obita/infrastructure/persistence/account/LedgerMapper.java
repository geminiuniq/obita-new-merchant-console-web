package com.obita.infrastructure.persistence.account;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Mapper
public interface LedgerMapper {

    int insertTx(@Param("id") UUID id,
                 @Param("merchantId") UUID merchantId,
                 @Param("txType") String txType,
                 @Param("referenceType") String referenceType,
                 @Param("referenceId") UUID referenceId,
                 @Param("memo") String memo,
                 @Param("createdAt") Instant createdAt);

    int insertEntry(@Param("txId") UUID txId,
                    @Param("accountId") UUID accountId,
                    @Param("assetCode") String assetCode,
                    @Param("direction") String direction,
                    @Param("amount") BigDecimal amount,
                    @Param("balanceAfter") BigDecimal balanceAfter,
                    @Param("createdAt") Instant createdAt);

    LedgerTxRow selectTx(@Param("id") UUID id);

    List<LedgerEntryRow> selectEntries(@Param("txId") UUID txId);

    List<LedgerEntryRow> selectAccountEntries(@Param("accountId") UUID accountId,
                                              @Param("limit") int limit,
                                              @Param("beforeId") Long beforeId);

    UUID findByReference(@Param("referenceType") String referenceType,
                         @Param("referenceId") UUID referenceId,
                         @Param("txType") String txType);
}
