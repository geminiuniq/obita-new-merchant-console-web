package com.obita.infrastructure.persistence.vault;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Mapper
public interface VaultMapper {

    // wallet_address
    int insertAddress(WalletAddressRow row);
    WalletAddressRow selectAddress(@Param("merchantId") UUID merchantId, @Param("id") UUID id);
    WalletAddressRow selectActiveAddress(@Param("merchantId") UUID merchantId,
                                         @Param("chainId") String chainId,
                                         @Param("purpose") String purpose);
    List<WalletAddressRow> listAddresses(@Param("merchantId") UUID merchantId);
    List<WalletAddressRow> listActiveByChain(@Param("chainId") String chainId);

    // chain_cursor
    Long readCursor(@Param("chainId") String chainId);
    int  upsertCursor(@Param("chainId") String chainId, @Param("block") long block);

    // deposit
    int insertDepositIfAbsent(DepositRow row);
    int updateDeposit(DepositRow row);
    DepositRow selectDeposit(@Param("merchantId") UUID merchantId, @Param("id") UUID id);
    List<DepositRow> findConfirming(@Param("limit") int limit);

    // withdrawal
    int insertWithdrawal(WithdrawalRow row);
    int updateWithdrawal(@Param("row") WithdrawalRow row, @Param("expectedVersion") int expectedVersion);
    WithdrawalRow selectWithdrawal(@Param("merchantId") UUID merchantId, @Param("id") UUID id);
    WithdrawalRow lockWithdrawal(@Param("merchantId") UUID merchantId, @Param("id") UUID id);
    List<WithdrawalRow> listWithdrawals(@Param("merchantId") UUID merchantId,
                                        @Param("status") String status,
                                        @Param("limit") int limit);
    List<WithdrawalRow> findInFlight(@Param("limit") int limit);
}
