package com.obita.api.advice;

import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Translates exceptions to the standard error envelope. The {@code code} is
 *  always a stable string from {@link ErrorCode}. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusiness(BusinessException ex, HttpServletRequest req) {
        var status = mapStatus(ex.code());
        if (status.is5xxServerError()) log.error("business 5xx {}: {}", ex.code(), ex.getMessage(), ex);
        return ResponseEntity.status(status).body(envelope(ex.code(), ex.getMessage(), req, ex.details()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex,
                                                                HttpServletRequest req) {
        var fieldErrors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                e -> e.getField(),
                e -> e.getDefaultMessage() == null ? "invalid" : e.getDefaultMessage(),
                (a, b) -> a));
        return ResponseEntity.badRequest()
            .body(envelope(ErrorCode.VALIDATION_FAILED, "request body invalid", req, Map.of("fields", fieldErrors)));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraint(ConstraintViolationException ex,
                                                                HttpServletRequest req) {
        return ResponseEntity.badRequest()
            .body(envelope(ErrorCode.VALIDATION_FAILED, ex.getMessage(), req, Map.of()));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<Map<String, Object>> handleDup(DuplicateKeyException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(envelope(ErrorCode.LEDGER_TX_DUPLICATE, "duplicate key: " + ex.getMostSpecificCause().getMessage(),
                req, Map.of()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleDenied(AccessDeniedException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(envelope(ErrorCode.FORBIDDEN, "access denied", req, Map.of()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnknown(Exception ex, HttpServletRequest req) {
        log.error("unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(envelope(ErrorCode.INTERNAL_ERROR, "internal error", req, Map.of()));
    }

    // ------------------------------------------------------------------------

    private static HttpStatus mapStatus(ErrorCode code) {
        return switch (code) {
            case VALIDATION_FAILED, IDEMPOTENCY_KEY_REQUIRED                       -> HttpStatus.BAD_REQUEST;
            case UNAUTHORIZED, AUTH_INVALID_CREDENTIALS,
                 AUTH_TOKEN_INVALID, AUTH_TOKEN_EXPIRED, AUTH_MFA_REQUIRED         -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN, MERCHANT_NOT_ACTIVE,
                 WITHDRAWAL_FOUR_EYES_VIOLATION, WITHDRAWAL_HALTED                 -> HttpStatus.FORBIDDEN;
            case NOT_FOUND, ORDER_NOT_FOUND, ACCOUNT_NOT_FOUND,
                 WALLET_ADDRESS_NOT_FOUND, DEPOSIT_NOT_FOUND,
                 WITHDRAWAL_NOT_FOUND, PAYMENT_INTENT_NOT_FOUND                    -> HttpStatus.NOT_FOUND;
            case ORDER_INVALID_STATE, WITHDRAWAL_INVALID_STATE,
                 PAYMENT_INTENT_INVALID_STATE, ORDER_DUPLICATE_NO,
                 WALLET_ADDRESS_DUPLICATE, LEDGER_TX_DUPLICATE,
                 LEDGER_UNBALANCED, INSUFFICIENT_BALANCE,
                 ORDER_REFUND_EXCEEDS_SETTLED, ORDER_EXPIRED,
                 WITHDRAWAL_ADDRESS_NOT_ALLOWLISTED,
                 WITHDRAWAL_AMOUNT_OVER_LIMIT,
                 QUOTE_EXPIRED                                                     -> HttpStatus.CONFLICT;
            case IDEMPOTENCY_KEY_CONFLICT                                          -> HttpStatus.UNPROCESSABLE_ENTITY;
            case RATE_LIMITED                                                       -> HttpStatus.TOO_MANY_REQUESTS;
            case DOWNSTREAM_UNAVAILABLE,
                 CUSTODY_PROVIDER_ERROR, RAMP_PROVIDER_ERROR,
                 BRIDGE_PROVIDER_ERROR                                             -> HttpStatus.SERVICE_UNAVAILABLE;
            case CHAIN_UNSUPPORTED                                                  -> HttpStatus.BAD_REQUEST;
            case INTERNAL_ERROR                                                     -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }

    private static Map<String, Object> envelope(ErrorCode code, String msg, HttpServletRequest req,
                                                Map<String, Object> details) {
        var body = new LinkedHashMap<String, Object>();
        body.put("code",      code.name());
        body.put("message",   msg);
        body.put("requestId", requestId(req));
        if (details != null && !details.isEmpty()) body.put("details", details);
        return body;
    }

    private static String requestId(HttpServletRequest req) {
        var h = req.getHeader("X-Request-Id");
        return (h != null && !h.isBlank()) ? h : UUID.randomUUID().toString();
    }
}
