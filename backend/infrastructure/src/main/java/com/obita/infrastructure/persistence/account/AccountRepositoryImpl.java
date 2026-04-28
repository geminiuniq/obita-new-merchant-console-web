package com.obita.infrastructure.persistence.account;

import com.obita.common.money.AssetCode;
import com.obita.common.tenancy.MerchantId;
import com.obita.domain.account.Account;
import com.obita.domain.account.AccountRepository;
import com.obita.domain.account.AccountType;

import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class AccountRepositoryImpl implements AccountRepository {

    private final AccountMapper mapper;

    public AccountRepositoryImpl(AccountMapper mapper) { this.mapper = mapper; }

    @Override public Optional<Account> findById(UUID id) {
        return Optional.ofNullable(mapper.selectById(id)).map(this::toDomain);
    }

    @Override public Optional<Account> findOne(MerchantId merchant, AccountType type, AssetCode asset) {
        return Optional.ofNullable(mapper.selectByOwner(merchant.value(), type.name(), asset.value()))
            .map(this::toDomain);
    }

    @Override public Account.WithBalance lockAndGetBalance(UUID accountId) {
        var row = mapper.lockById(accountId);
        if (row == null) return null;
        var balance = mapper.currentBalance(accountId);
        return new Account.WithBalance(toDomain(row), balance == null ? BigDecimal.ZERO : balance);
    }

    @Override public Account create(Account a) {
        var r = new AccountRow();
        r.id           = a.id();
        r.merchantId   = a.merchantId().value();
        r.accountType  = a.accountType().name();
        r.assetCode    = a.assetCode().value();
        r.status       = a.status();
        r.createdAt    = a.createdAt();
        mapper.insert(r);
        return a;
    }

    @Override public BigDecimal currentBalance(UUID accountId) {
        var b = mapper.currentBalance(accountId);
        return b == null ? BigDecimal.ZERO : b;
    }

    @Override public List<Account.WithBalance> listForMerchant(MerchantId merchant) {
        return mapper.listForMerchant(merchant.value()).stream()
            .map(r -> new Account.WithBalance(
                new Account(r.id, MerchantId.of(r.merchantId),
                    AccountType.valueOf(r.accountType), AssetCode.of(r.assetCode),
                    r.status, r.createdAt),
                r.balance == null ? BigDecimal.ZERO : r.balance
            ))
            .toList();
    }

    private Account toDomain(AccountRow r) {
        return new Account(r.id, MerchantId.of(r.merchantId),
            AccountType.valueOf(r.accountType), AssetCode.of(r.assetCode),
            r.status, r.createdAt);
    }
}
