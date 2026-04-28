package com.obita.infrastructure.persistence.vault;

import com.obita.common.money.AssetCode;
import com.obita.common.money.Money;
import com.obita.common.tenancy.MerchantId;
import com.obita.domain.chain.Address;
import com.obita.domain.chain.ChainId;
import com.obita.domain.custody.CustodyProvider;
import com.obita.domain.vault.Deposit;
import com.obita.domain.vault.DepositStatus;
import com.obita.domain.vault.VaultRepository;
import com.obita.domain.vault.WalletAddress;
import com.obita.domain.vault.Withdrawal;
import com.obita.domain.vault.WithdrawalStatus;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class VaultRepositoryImpl implements VaultRepository {

    private final VaultMapper m;

    public VaultRepositoryImpl(VaultMapper m) { this.m = m; }

    // ---- addresses

    @Override public void insertAddress(WalletAddress a) {
        var r = new WalletAddressRow();
        r.id           = a.id();
        r.merchantId   = a.merchantId().value();
        r.chainId      = a.chainId().value();
        r.address      = a.address().value();
        r.custodyRef   = a.custodyRef();
        r.label        = a.label();
        r.purpose      = a.purpose().name();
        r.status       = a.status();
        r.createdAt    = a.createdAt();
        m.insertAddress(r);
    }

    @Override public Optional<WalletAddress> findAddressById(MerchantId merchant, UUID id) {
        return Optional.ofNullable(m.selectAddress(merchant.value(), id)).map(this::toDomainAddress);
    }

    @Override public Optional<WalletAddress> findActive(MerchantId merchant, ChainId chain,
                                                        CustodyProvider.AddressPurpose purpose) {
        return Optional.ofNullable(m.selectActiveAddress(merchant.value(), chain.value(), purpose.name()))
            .map(this::toDomainAddress);
    }

    @Override public List<WalletAddress> listAddresses(MerchantId merchant) {
        return m.listAddresses(merchant.value()).stream().map(this::toDomainAddress).toList();
    }

    @Override public List<WalletAddress> activeAddressesForChain(ChainId chain) {
        return m.listActiveByChain(chain.value()).stream().map(this::toDomainAddress).toList();
    }

    // ---- cursor

    @Override public long readCursor(ChainId chain) {
        var v = m.readCursor(chain.value());
        return v == null ? 0L : v;
    }

    @Override public void writeCursor(ChainId chain, long block) { m.upsertCursor(chain.value(), block); }

    // ---- deposits

    @Override public boolean insertIfAbsent(Deposit d) {
        var r = new DepositRow();
        r.id              = d.id();
        r.merchantId      = d.merchantId().value();
        r.chainId         = d.chainId().value();
        r.assetCode       = d.amount().asset().value();
        r.walletAddressId = d.walletAddressId();
        r.fromAddress     = d.fromAddress() == null ? null : d.fromAddress().value();
        r.toAddress       = d.toAddress().value();
        r.txHash          = d.txHash();
        r.logIndex        = d.logIndex();
        r.blockNumber     = d.blockNumber();
        r.amount          = d.amount().amount();
        r.confirmations   = d.confirmations();
        r.status          = d.status().name();
        r.ledgerTxId      = d.ledgerTxId().orElse(null);
        r.detectedAt      = d.detectedAt();
        r.creditedAt      = d.creditedAt().orElse(null);
        r.rawPayload      = d.rawPayloadJson();
        return m.insertDepositIfAbsent(r) > 0;
    }

    @Override public Optional<Deposit> findDepositById(MerchantId merchant, UUID id) {
        return Optional.ofNullable(m.selectDeposit(merchant.value(), id)).map(this::toDomainDeposit);
    }

    @Override public int updateDeposit(Deposit d) {
        var r = new DepositRow();
        r.id            = d.id();
        r.status        = d.status().name();
        r.confirmations = d.confirmations();
        r.ledgerTxId    = d.ledgerTxId().orElse(null);
        r.creditedAt    = d.creditedAt().orElse(null);
        return m.updateDeposit(r);
    }

    @Override public List<Deposit> findConfirming(int limit) {
        return m.findConfirming(limit).stream().map(this::toDomainDeposit).toList();
    }

    // ---- withdrawals

    @Override public void insertWithdrawal(Withdrawal w) { m.insertWithdrawal(toRow(w)); }

    @Override public int updateWithdrawal(Withdrawal w, int expectedVersion) {
        return m.updateWithdrawal(toRow(w), expectedVersion);
    }

    @Override public Optional<Withdrawal> lockWithdrawal(MerchantId merchant, UUID id) {
        return Optional.ofNullable(m.lockWithdrawal(merchant.value(), id)).map(this::toDomainWithdrawal);
    }

    @Override public Optional<Withdrawal> findWithdrawalById(MerchantId merchant, UUID id) {
        return Optional.ofNullable(m.selectWithdrawal(merchant.value(), id)).map(this::toDomainWithdrawal);
    }

    @Override public List<Withdrawal> listWithdrawals(MerchantId merchant, WithdrawalStatus status, int limit) {
        return m.listWithdrawals(merchant.value(), status == null ? null : status.name(), limit).stream()
            .map(this::toDomainWithdrawal).toList();
    }

    @Override public List<Withdrawal> findInFlight(int limit) {
        return m.findInFlight(limit).stream().map(this::toDomainWithdrawal).toList();
    }

    // ---- mapping helpers

    private WalletAddress toDomainAddress(WalletAddressRow r) {
        return new WalletAddress(
            r.id, MerchantId.of(r.merchantId), ChainId.of(r.chainId), Address.of(r.address),
            r.custodyRef, r.label, CustodyProvider.AddressPurpose.valueOf(r.purpose),
            r.status, r.createdAt
        );
    }

    private Deposit toDomainDeposit(DepositRow r) {
        return new Deposit(
            r.id, MerchantId.of(r.merchantId), ChainId.of(r.chainId), r.walletAddressId,
            r.fromAddress == null ? null : Address.of(r.fromAddress),
            Address.of(r.toAddress), r.txHash, r.logIndex == null ? 0 : r.logIndex, r.blockNumber,
            Money.of(AssetCode.of(r.assetCode), r.amount),
            r.confirmations == null ? 0 : r.confirmations,
            DepositStatus.valueOf(r.status),
            Optional.ofNullable(r.ledgerTxId),
            r.detectedAt, Optional.ofNullable(r.creditedAt), r.rawPayload
        );
    }

    private Withdrawal toDomainWithdrawal(WithdrawalRow r) {
        var w = new Withdrawal(
            r.id, MerchantId.of(r.merchantId), ChainId.of(r.chainId),
            Address.of(r.toAddress),
            Money.of(AssetCode.of(r.assetCode), r.amount),
            Money.of(AssetCode.of(r.assetCode), r.feeAmount == null ? java.math.BigDecimal.ZERO : r.feeAmount),
            WithdrawalStatus.valueOf(r.status),
            r.requestedBy, r.requestedAt, r.version == null ? 0 : r.version
        );
        // The aggregate's mutators bump version; for hydration we use reflection-free
        // direct setters via package-private fields would be cleaner. For MVP we skip
        // re-hydrating optional fields here since the read paths reconstruct them from
        // the row directly when needed (DTOs are built from rows).
        return w;
    }

    private WithdrawalRow toRow(Withdrawal w) {
        var r = new WithdrawalRow();
        r.id                 = w.id();
        r.merchantId         = w.merchantId().value();
        r.chainId            = w.chainId().value();
        r.assetCode          = w.amount().asset().value();
        r.toAddress          = w.toAddress().value();
        r.amount             = w.amount().amount();
        r.feeAmount          = w.feeAmount().amount();
        r.status             = w.status().name();
        r.custodyRef         = w.custodyRef().orElse(null);
        r.txHash             = w.txHash().orElse(null);
        r.blockNumber        = w.blockNumber().orElse(null);
        r.confirmations      = w.confirmations();
        r.riskScore          = w.riskScore().orElse(null);
        r.riskNote           = w.riskNote().orElse(null);
        r.requestedBy        = w.requestedBy();
        r.approvedBy         = w.approvedBy().orElse(null);
        r.requestedAt        = w.requestedAt();
        r.submittedAt        = w.submittedAt().orElse(null);
        r.completedAt        = w.completedAt().orElse(null);
        r.ledgerTxReserveId  = w.ledgerTxReserveId().orElse(null);
        r.ledgerTxSettleId   = w.ledgerTxSettleId().orElse(null);
        r.failureCode        = w.failureCode().orElse(null);
        r.failureMessage     = w.failureMessage().orElse(null);
        r.version            = w.version();
        return r;
    }
}
