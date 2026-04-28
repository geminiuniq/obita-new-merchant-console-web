package com.obita.common.error;

/**
 * Stable, client-visible error codes. Clients branch on the {@code code} field
 * of error responses; never on the {@code message}.
 *
 * Naming: {@code <DOMAIN>_<CONDITION>}. The first segment is the area; the rest
 * describes the condition. Once shipped, codes are never renamed (only added or
 * deprecated with a stable replacement).
 */
public enum ErrorCode {

    // --- generic
    VALIDATION_FAILED,
    NOT_FOUND,
    UNAUTHORIZED,
    FORBIDDEN,
    INTERNAL_ERROR,
    DOWNSTREAM_UNAVAILABLE,
    RATE_LIMITED,

    // --- idempotency
    IDEMPOTENCY_KEY_CONFLICT,
    IDEMPOTENCY_KEY_REQUIRED,

    // --- merchant / auth
    MERCHANT_NOT_ACTIVE,
    AUTH_INVALID_CREDENTIALS,
    AUTH_TOKEN_INVALID,
    AUTH_TOKEN_EXPIRED,
    AUTH_MFA_REQUIRED,

    // --- account / ledger
    ACCOUNT_NOT_FOUND,
    INSUFFICIENT_BALANCE,
    LEDGER_UNBALANCED,
    LEDGER_TX_DUPLICATE,

    // --- orders
    ORDER_NOT_FOUND,
    ORDER_DUPLICATE_NO,
    ORDER_INVALID_STATE,
    ORDER_EXPIRED,
    ORDER_REFUND_EXCEEDS_SETTLED,

    // --- vault
    WALLET_ADDRESS_NOT_FOUND,
    WALLET_ADDRESS_DUPLICATE,
    DEPOSIT_NOT_FOUND,
    WITHDRAWAL_NOT_FOUND,
    WITHDRAWAL_INVALID_STATE,
    WITHDRAWAL_FOUR_EYES_VIOLATION,
    WITHDRAWAL_ADDRESS_NOT_ALLOWLISTED,
    WITHDRAWAL_AMOUNT_OVER_LIMIT,
    WITHDRAWAL_HALTED,

    // --- cashier
    PAYMENT_INTENT_NOT_FOUND,
    PAYMENT_INTENT_INVALID_STATE,
    QUOTE_EXPIRED,

    // --- chain / custody / ramp / bridge
    CHAIN_UNSUPPORTED,
    CUSTODY_PROVIDER_ERROR,
    RAMP_PROVIDER_ERROR,
    BRIDGE_PROVIDER_ERROR
}
