package com.obita.infrastructure.persistence.account;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.UUID;

@Mapper
public interface AccountMapper {

    int insert(AccountRow row);

    AccountRow selectById(@Param("id") UUID id);

    AccountRow selectByOwner(@Param("merchantId") UUID merchantId,
                             @Param("type") String type,
                             @Param("asset") String asset);

    AccountRow lockById(@Param("id") UUID id);

    /** Latest balance_after for an account, derived from the last entry. */
    BigDecimal currentBalance(@Param("id") UUID id);
}
