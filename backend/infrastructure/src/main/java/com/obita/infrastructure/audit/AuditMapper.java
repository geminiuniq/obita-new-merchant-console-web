package com.obita.infrastructure.audit;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.UUID;

@Mapper
public interface AuditMapper {

    @Insert("""
        INSERT INTO audit_log (actor_type, actor_id, merchant_id, action,
                               resource_type, resource_id, request_id, ip, user_agent,
                               payload, result)
        VALUES (#{actorType}, #{actorId}, #{merchantId}, #{action},
                #{resourceType}, #{resourceId}, #{requestId}, #{ip}::inet, #{userAgent},
                COALESCE(#{payload}::jsonb, '{}'::jsonb), #{result})
        """)
    int insert(@Param("actorType")    String actorType,
               @Param("actorId")      UUID actorId,
               @Param("merchantId")   UUID merchantId,
               @Param("action")       String action,
               @Param("resourceType") String resourceType,
               @Param("resourceId")   String resourceId,
               @Param("requestId")    String requestId,
               @Param("ip")           String ip,
               @Param("userAgent")    String userAgent,
               @Param("payload")      String payload,
               @Param("result")       String result);
}
