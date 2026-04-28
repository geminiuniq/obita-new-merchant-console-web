package com.obita.api.advice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;
import com.obita.common.idempotency.Idempotent;
import com.obita.common.tenancy.Principal;
import com.obita.infrastructure.idempotency.IdempotencyMapper;
import com.obita.infrastructure.idempotency.IdempotencyRow;

import jakarta.servlet.http.HttpServletRequest;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Implements the {@code Idempotency-Key} contract:
 *
 *  - First call with key K from merchant M proceeds; the response is captured
 *    and stored under (M, K) on success.
 *  - Subsequent calls with same K + same body get the cached response.
 *  - Subsequent calls with same K + different body get HTTP 422.
 *
 * The reservation row is inserted *before* the controller body runs so two
 * concurrent calls with the same key serialise via the unique constraint.
 */
@Aspect
@Component
public class IdempotencyAdvice {

    private final IdempotencyMapper mapper;
    private final ObjectMapper json;

    public IdempotencyAdvice(IdempotencyMapper mapper, ObjectMapper json) {
        this.mapper = mapper;
        this.json   = json;
    }

    @Around("@annotation(idempotent)")
    public Object around(ProceedingJoinPoint pjp, Idempotent idempotent) throws Throwable {
        var attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return pjp.proceed();
        HttpServletRequest req = attrs.getRequest();

        String key = req.getHeader("Idempotency-Key");
        if (key == null || key.isBlank()) {
            throw new BusinessException(ErrorCode.IDEMPOTENCY_KEY_REQUIRED,
                "Idempotency-Key header required for " + req.getMethod() + " " + req.getRequestURI());
        }
        if (key.length() > 128) {
            throw new BusinessException(ErrorCode.IDEMPOTENCY_KEY_REQUIRED,
                "Idempotency-Key too long (max 128)");
        }

        Principal principal = (Principal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        var merchantId = principal.merchantId().value();

        // Build a stable hash of the request body via the bound method args.
        var sig = (MethodSignature) pjp.getSignature();
        String hash = sha256(json.writeValueAsString(pjp.getArgs()));

        // Try to reserve. ON CONFLICT DO NOTHING => returns 0 on duplicate.
        int reserved = mapper.tryInsert(merchantId, key, hash);
        if (reserved == 0) {
            IdempotencyRow row = mapper.select(merchantId, key);
            if (!row.requestHash.equals(hash)) {
                throw new BusinessException(ErrorCode.IDEMPOTENCY_KEY_CONFLICT,
                    "Idempotency-Key reused with a different request body")
                    .with("key", key);
            }
            if (row.completedAt != null && row.responseBody != null) {
                // Replay the previous successful response. Status code is rebuilt
                // by the calling controller serialising the cached body.
                return json.readValue(row.responseBody, sig.getReturnType());
            }
            // In-flight request still running — propagate as 422 to avoid double-execution.
            throw new BusinessException(ErrorCode.IDEMPOTENCY_KEY_CONFLICT,
                "Idempotency-Key request still in flight; retry shortly")
                .with("key", key);
        }

        Object result;
        try {
            result = pjp.proceed();
        } catch (Throwable t) {
            // Failed runs are not cached. The reservation row stays so a retry
            // with the same key + same body proceeds idempotently after the
            // underlying issue is resolved.
            throw t;
        }
        mapper.complete(merchantId, key, 200, json.writeValueAsString(result));
        return result;
    }

    private static String sha256(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
