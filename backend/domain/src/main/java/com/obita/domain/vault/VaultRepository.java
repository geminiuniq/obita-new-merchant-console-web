package com.obita.domain.vault;

import com.obita.common.tenancy.MerchantId;
import com.obita.domain.chain.ChainId;
import com.obita.domain.custody.CustodyProvider.AddressPurpose;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VaultRepository {

    // ----- wallet addresses
    void insertAddress(WalletAddress addr);
    Optional<WalletAddress> findAddressById(MerchantId merchant, UUID id);
    Optional<WalletAddress> findActive(MerchantId merchant, ChainId chain, AddressPurpose purpose);
    List<WalletAddress> listAddresses(MerchantId merchant);
    /** Used by scanners — every active address watched on a given chain. */
    List<WalletAddress> activeAddressesForChain(ChainId chain);

    // ----- chain cursor
    long readCursor(ChainId chain);
    void writeCursor(ChainId chain, long block);

    // ----- deposits
    /** Insert; returns true if new (unique on chain + tx_hash + log_index). */
    boolean insertIfAbsent(Deposit deposit);
    Optional<Deposit> findDepositById(MerchantId merchant, UUID id);
    int updateDeposit(Deposit deposit);
    List<Deposit> findConfirming(int limit);

    // ----- withdrawals
    void insertWithdrawal(Withdrawal w);
    int updateWithdrawal(Withdrawal w, int expectedVersion);
    Optional<Withdrawal> lockWithdrawal(MerchantId merchant, UUID id);
    Optional<Withdrawal> findWithdrawalById(MerchantId merchant, UUID id);
    List<Withdrawal> listWithdrawals(MerchantId merchant, WithdrawalStatus status, int limit);
    /** Used by the custody status poller. */
    List<Withdrawal> findInFlight(int limit);
}
