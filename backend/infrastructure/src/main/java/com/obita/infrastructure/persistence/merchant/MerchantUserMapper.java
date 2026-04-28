package com.obita.infrastructure.persistence.merchant;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.time.Instant;
import java.util.UUID;

@Mapper
public interface MerchantUserMapper {

    MerchantUserRow selectByMerchantCodeAndUsername(@Param("code") String code,
                                                    @Param("username") String username);

    MerchantUserRow selectById(@Param("merchantId") UUID merchantId,
                               @Param("id") UUID id);

    @Update("UPDATE app_user SET last_login_at = #{at} WHERE id = #{id}")
    int touchLastLogin(@Param("id") UUID id, @Param("at") Instant at);
}
