package com.obita.domain.merchant;

import com.obita.common.tenancy.MerchantId;

import java.util.Optional;
import java.util.UUID;

public interface MerchantUserRepository {

    /** Look up a user for login: by merchant.code + username. */
    Optional<MerchantUser> findByMerchantCodeAndUsername(String merchantCode, String username);

    Optional<MerchantUser> findById(MerchantId merchant, UUID userId);

    void touchLastLogin(UUID userId);
}
