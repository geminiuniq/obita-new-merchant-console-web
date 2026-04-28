package com.obita.domain.account;

/**
 * Logical role an account plays for its owner. The same merchant can hold
 * many accounts of different types per asset — each lives at a different
 * point in the money lifecycle.
 */
public enum AccountType {
    /** Spendable balance. The default debit/credit target for routine ops. */
    AVAILABLE,
    /** Detected but not yet confirmed (deposits with insufficient confirmations). */
    PENDING,
    /** Earmarked for an in-flight outflow (withdrawal in progress, refund queued). */
    RESERVED,
    /** Platform fee bucket. Only the platform merchant uses this type. */
    FEE,
    /** Order settlement bucket — distinct from AVAILABLE so settlement reports
     *  don't drift with day-to-day movement. */
    SETTLEMENT
}
