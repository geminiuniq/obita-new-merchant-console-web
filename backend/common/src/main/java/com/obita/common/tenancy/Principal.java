package com.obita.common.tenancy;

import java.util.Set;
import java.util.UUID;

/**
 * Authenticated principal extracted from the JWT. Cheap to construct; passed
 * down through method args rather than via thread-local — explicit is safer
 * than implicit for tenant-scoped logic.
 */
public record Principal(
    UUID userId,
    MerchantId merchantId,
    String username,
    Set<String> roles
) {
    public boolean hasRole(String role) { return roles.contains(role); }
}
