package com.obita.infrastructure.persistence.merchant;

import com.obita.common.tenancy.MerchantId;
import com.obita.domain.merchant.MerchantUser;
import com.obita.domain.merchant.MerchantUserRepository;

import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public class MerchantUserRepositoryImpl implements MerchantUserRepository {

    private final MerchantUserMapper mapper;

    public MerchantUserRepositoryImpl(MerchantUserMapper mapper) { this.mapper = mapper; }

    @Override public Optional<MerchantUser> findByMerchantCodeAndUsername(String code, String username) {
        return Optional.ofNullable(mapper.selectByMerchantCodeAndUsername(code, username))
            .map(this::toDomain);
    }

    @Override public Optional<MerchantUser> findById(MerchantId merchant, UUID userId) {
        return Optional.ofNullable(mapper.selectById(merchant.value(), userId))
            .map(this::toDomain);
    }

    @Override public void touchLastLogin(UUID userId) { mapper.touchLastLogin(userId, Instant.now()); }

    private MerchantUser toDomain(MerchantUserRow r) {
        return new MerchantUser(
            r.id, MerchantId.of(r.merchantId), r.username, r.passwordHash,
            r.roles == null ? Set.of() : Set.of(r.roles),
            r.mfaEnabled != null && r.mfaEnabled,
            r.status,
            r.lastLoginAt
        );
    }
}
