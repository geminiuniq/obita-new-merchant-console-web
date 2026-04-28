package com.obita.api.vault;

import com.obita.common.audit.Audited;
import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;
import com.obita.common.id.IdGenerator;
import com.obita.common.money.Money;
import com.obita.common.tenancy.MerchantId;
import com.obita.common.tenancy.Principal;
import com.obita.domain.account.AccountRepository;
import com.obita.domain.account.AccountType;
import com.obita.domain.account.LedgerPostingService;
import com.obita.domain.account.LedgerTxType;
import com.obita.domain.chain.Address;
import com.obita.domain.chain.ChainAdapterRegistry;
import com.obita.domain.chain.ChainId;
import com.obita.domain.custody.CustodyProvider;
import com.obita.domain.custody.CustodyProvider.AddressPurpose;
import com.obita.domain.vault.VaultRepository;
import com.obita.domain.vault.WalletAddress;
import com.obita.domain.vault.Withdrawal;
import com.obita.domain.vault.WithdrawalStatus;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Vault: wallet provisioning, withdrawal request/approve/submit, status polling.
 *
 * Each command is one DB transaction. The 4-eyes rule for approvals lives in
 * the {@link Withdrawal} aggregate; we add a configurable amount limit on top.
 */
@Service
public class VaultApplicationService {

    private static final Logger log = LoggerFactory.getLogger(VaultApplicationService.class);

    private final VaultRepository vault;
    private final AccountRepository accounts;
    private final LedgerPostingService posting;
    private final CustodyProvider custody;
    private final ChainAdapterRegistry chains;
    private final BigDecimal autoReviewThreshold;
    private final BigDecimal hardLimit;

    public VaultApplicationService(
        VaultRepository vault,
        AccountRepository accounts,
        LedgerPostingService posting,
        CustodyProvider custody,
        ChainAdapterRegistry chains,
        @Value("${obita.vault.auto-review-threshold:1000}") BigDecimal autoReviewThreshold,
        @Value("${obita.vault.hard-limit:100000}")          BigDecimal hardLimit
    ) {
        this.vault    = vault;
        this.accounts = accounts;
        this.posting  = posting;
        this.custody  = custody;
        this.chains   = chains;
        this.autoReviewThreshold = autoReviewThreshold;
        this.hardLimit           = hardLimit;
    }

    // ------------------------------------------------------------------
    // Wallet addresses
    // ------------------------------------------------------------------

    @Transactional
    @Audited(action = "VAULT.ADDRESS_PROVISION", resourceType = "WALLET_ADDRESS")
    public WalletAddress provisionAddress(Principal actor, ChainId chain, AddressPurpose purpose, String label) {
        // MVP: one active address per (merchant, chain, purpose). Reuse if exists.
        var existing = vault.findActive(actor.merchantId(), chain, purpose);
        if (existing.isPresent()) return existing.get();

        // Validate chain is configured.
        chains.require(chain);

        var issued = custody.issue(actor.merchantId(), chain, purpose);
        var addr = new WalletAddress(
            IdGenerator.newId(),
            actor.merchantId(),
            chain,
            issued.address(),
            issued.custodyRef(),
            label,
            purpose,
            "ACTIVE",
            Instant.now()
        );
        vault.insertAddress(addr);
        log.info("vault.provision merchant={} chain={} address={}",
            actor.merchantId(), chain, issued.address());
        return addr;
    }

    @Transactional(readOnly = true)
    public List<WalletAddress> listAddresses(Principal actor) {
        return vault.listAddresses(actor.merchantId());
    }

    // ------------------------------------------------------------------
    // Withdrawals
    // ------------------------------------------------------------------

    @Transactional
    @Audited(action = "VAULT.WITHDRAW_REQUEST", resourceType = "WITHDRAWAL")
    public Withdrawal requestWithdrawal(
        Principal actor,
        ChainId chain,
        Address toAddress,
        Money amount,
        Money feeAmount
    ) {
        if (amount.amount().compareTo(hardLimit) > 0) {
            throw new BusinessException(ErrorCode.WITHDRAWAL_AMOUNT_OVER_LIMIT,
                "amount exceeds hard limit " + hardLimit)
                .with("limit", hardLimit.toPlainString());
        }
        // Reserve balance: AVAILABLE → RESERVED, in the same transaction.
        var available = mustAccount(actor.merchantId(), AccountType.AVAILABLE,  amount.asset().value());
        var reserved  = mustAccount(actor.merchantId(), AccountType.RESERVED,   amount.asset().value());

        var withdrawal = Withdrawal.request(actor.merchantId(), chain, toAddress, amount, feeAmount, actor.userId());

        var reserveTx = posting.postTransfer(
            actor.merchantId(),
            LedgerTxType.WITHDRAW,
            available, reserved,
            amount,
            "WITHDRAWAL", withdrawal.id(), "withdrawal reserve"
        );
        withdrawal.attachReserveLedgerTx(reserveTx.id());

        // Auto-route to risk review if amount above threshold.
        if (amount.amount().compareTo(autoReviewThreshold) > 0) {
            withdrawal.enterRiskReview(50, "amount above auto-review threshold");
        }
        vault.insertWithdrawal(withdrawal);
        return withdrawal;
    }

    @Transactional
    @Audited(action = "VAULT.WITHDRAW_APPROVE", resourceType = "WITHDRAWAL")
    public Withdrawal approveWithdrawal(Principal actor, UUID id) {
        var w = mustLockWithdrawal(actor.merchantId(), id);
        w.approve(actor.userId());
        if (vault.updateWithdrawal(w, w.version() - 1) != 1) {
            throw new BusinessException(ErrorCode.WITHDRAWAL_INVALID_STATE, "stale withdrawal at approve");
        }

        // Submit to custody and persist the ref atomically. Any provider error
        // here aborts the transaction, leaving the row in APPROVED state — the
        // operator can retry.
        var fee = chains.require(w.chainId()).estimateFee(
            new com.obita.domain.chain.ChainAdapter.TransferIntent(
                w.chainId(), w.amount().asset(),
                Address.of("0x0"),                  // custody chooses the from address
                w.toAddress(), w.amount().amount()
            )
        );
        var ref = custody.submit(new CustodyProvider.TransferIntent(
            w.id(), actor.merchantId(), w.chainId(),
            Address.of("0x0"), w.toAddress(), w.amount(), fee.networkFee()
        ));
        w.submitToCustody(ref.value());
        if (vault.updateWithdrawal(w, w.version() - 1) != 1) {
            throw new BusinessException(ErrorCode.WITHDRAWAL_INVALID_STATE, "stale withdrawal at submit");
        }
        log.info("vault.withdraw.submitted id={} ref={}", w.id(), ref.value());
        return w;
    }

    @Transactional
    @Audited(action = "VAULT.WITHDRAW_REJECT", resourceType = "WITHDRAWAL")
    public Withdrawal rejectWithdrawal(Principal actor, UUID id, String reason) {
        var w = mustLockWithdrawal(actor.merchantId(), id);
        w.reject(reason);

        // Reverse the reserve: RESERVED → AVAILABLE.
        var reserved  = mustAccount(actor.merchantId(), AccountType.RESERVED,  w.amount().asset().value());
        var available = mustAccount(actor.merchantId(), AccountType.AVAILABLE, w.amount().asset().value());
        posting.postTransfer(actor.merchantId(), LedgerTxType.INTERNAL,
            reserved, available, w.amount(),
            "WITHDRAWAL", w.id(), "rejected reverse");

        if (vault.updateWithdrawal(w, w.version() - 1) != 1) {
            throw new BusinessException(ErrorCode.WITHDRAWAL_INVALID_STATE, "stale withdrawal at reject");
        }
        return w;
    }

    @Transactional(readOnly = true)
    public Withdrawal getWithdrawal(Principal actor, UUID id) {
        return vault.findWithdrawalById(actor.merchantId(), id)
            .orElseThrow(() -> new BusinessException(ErrorCode.WITHDRAWAL_NOT_FOUND, "withdrawal not found"));
    }

    @Transactional(readOnly = true)
    public List<Withdrawal> listWithdrawals(Principal actor, WithdrawalStatus status, int limit) {
        return vault.listWithdrawals(actor.merchantId(), status, limit);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private Withdrawal mustLockWithdrawal(MerchantId merchant, UUID id) {
        return vault.lockWithdrawal(merchant, id)
            .orElseThrow(() -> new BusinessException(ErrorCode.WITHDRAWAL_NOT_FOUND, "withdrawal not found"));
    }

    private UUID mustAccount(MerchantId merchant, AccountType type, String asset) {
        return accounts.findOne(merchant, type, com.obita.common.money.AssetCode.of(asset))
            .map(a -> a.id())
            .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND,
                "account not found: " + type + " / " + asset));
    }

    /** Scanner entry: insert deposit row + post pending ledger entry in
     *  ONE transaction. Putting it on this @Service ensures Spring's
     *  @Transactional AOP proxy is honoured (the scanner's lambda would
     *  otherwise bypass an in-class proxy). */
    @Transactional
    public boolean ingestDeposit(com.obita.domain.vault.Deposit detected) {
        if (!vault.insertIfAbsent(detected)) return false;
        var txId = creditPendingInner(detected.merchantId(), detected.amount(), detected.id());
        var updated = new com.obita.domain.vault.Deposit(
            detected.id(), detected.merchantId(), detected.chainId(), detected.walletAddressId(),
            detected.fromAddress(), detected.toAddress(), detected.txHash(), detected.logIndex(),
            detected.blockNumber(), detected.amount(), detected.confirmations(),
            detected.status(), Optional.of(txId), detected.detectedAt(), detected.creditedAt(),
            detected.rawPayloadJson()
        );
        vault.updateDeposit(updated);
        return true;
    }

    /** Scanner advance entry-point: confirms a deposit + posts PENDING → AVAILABLE
     *  on the move to CREDITED. One transaction. */
    @Transactional
    public void advanceDeposit(com.obita.domain.vault.Deposit d, int newConfirmations,
                                com.obita.domain.vault.DepositStatus newStatus) {
        Optional<UUID> ledgerTxId = d.ledgerTxId();
        if (newStatus == com.obita.domain.vault.DepositStatus.CREDITED) {
            // Always post PENDING → AVAILABLE when transitioning to CREDITED;
            // the prior tx (LIABILITY → PENDING) lives in d.ledgerTxId().
            var confirmTxId = creditConfirmedInner(d.merchantId(), d.amount(), d.id());
            if (ledgerTxId.isEmpty()) ledgerTxId = Optional.of(confirmTxId);
        }
        var updated = new com.obita.domain.vault.Deposit(
            d.id(), d.merchantId(), d.chainId(), d.walletAddressId(),
            d.fromAddress(), d.toAddress(), d.txHash(), d.logIndex(), d.blockNumber(),
            d.amount(), newConfirmations, newStatus,
            ledgerTxId,
            d.detectedAt(),
            newStatus == com.obita.domain.vault.DepositStatus.CREDITED
                ? Optional.of(java.time.Instant.now()) : d.creditedAt(),
            d.rawPayloadJson()
        );
        vault.updateDeposit(updated);
    }

    private UUID creditPendingInner(MerchantId merchant, Money amount, UUID depositId) {
        var liability = mustAccount(
            MerchantId.of(java.util.UUID.fromString("00000000-0000-0000-0000-000000000001")),
            AccountType.SETTLEMENT, amount.asset().value());           // platform-side contra
        var pending   = mustAccount(merchant, AccountType.PENDING,   amount.asset().value());
        return posting.postTransfer(merchant, LedgerTxType.DEPOSIT,
            liability, pending, amount, "DEPOSIT", depositId, "deposit pending").id();
    }

    private UUID creditConfirmedInner(MerchantId merchant, Money amount, UUID depositId) {
        var pending   = mustAccount(merchant, AccountType.PENDING,   amount.asset().value());
        var available = mustAccount(merchant, AccountType.AVAILABLE, amount.asset().value());
        return posting.postTransfer(merchant, LedgerTxType.DEPOSIT,
            pending, available, amount, "DEPOSIT", depositId, "deposit confirmed").id();
    }
}
