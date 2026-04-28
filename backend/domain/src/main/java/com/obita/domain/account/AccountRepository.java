package com.obita.domain.account;

import com.obita.common.money.AssetCode;
import com.obita.common.tenancy.MerchantId;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port for account persistence. Implemented by infrastructure/MyBatis. */
public interface AccountRepository {

    Optional<Account> findById(UUID id);

    Optional<Account> findOne(MerchantId merchant, AccountType type, AssetCode asset);

    /** Acquires {@code SELECT ... FOR UPDATE} on the account row. Returns the
     *  current balance derived from the latest ledger entry on that account
     *  (or zero if none). MUST be called inside a transaction. */
    Account.WithBalance lockAndGetBalance(UUID accountId);

    /** Used at merchant onboarding to provision the standard account set. */
    Account create(Account account);

    /** Reads current balance without locking; for read APIs only. */
    BigDecimal currentBalance(UUID accountId);

    /** All accounts owned by the merchant, with current balance attached. */
    List<Account.WithBalance> listForMerchant(MerchantId merchant);
}
