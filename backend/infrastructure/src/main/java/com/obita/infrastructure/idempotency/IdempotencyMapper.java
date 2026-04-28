package com.obita.infrastructure.idempotency;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.UUID;

@Mapper
public interface IdempotencyMapper {

    /** Atomically reserve a key. Returns 1 if inserted, 0 if it already exists. */
    int tryInsert(@Param("merchantId") UUID merchantId,
                  @Param("key") String key,
                  @Param("requestHash") String requestHash);

    IdempotencyRow select(@Param("merchantId") UUID merchantId, @Param("key") String key);

    int complete(@Param("merchantId") UUID merchantId,
                 @Param("key") String key,
                 @Param("status") int status,
                 @Param("body") String body);

    int deleteOlderThan(@Param("seconds") long seconds);
}
