package com.obita.domain.merchant;

import com.obita.common.tenancy.MerchantId;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/** Backend-internal projection of an {@code app_user} row. Authentication
 *  resolves a username + merchant code into one of these. */
public record MerchantUser(
    UUID id,
    MerchantId merchantId,
    String username,
    String passwordHash,
    Set<String> roles,
    boolean mfaEnabled,
    String status,
    Instant lastLoginAt
) {
    public boolean isActive() { return "ACTIVE".equals(status); }
}
