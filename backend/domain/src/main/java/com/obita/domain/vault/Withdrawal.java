package com.obita.domain.vault;

import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;
import com.obita.common.id.IdGenerator;
import com.obita.common.money.Money;
import com.obita.common.tenancy.MerchantId;
import com.obita.domain.chain.Address;
import com.obita.domain.chain.ChainId;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Mutable aggregate for withdrawal lifecycle. Uses optimistic-lock {@link #version()}. */
public class Withdrawal {

    private final UUID id;
    private final MerchantId merchantId;
    private final ChainId chainId;
    private final Address toAddress;
    private final Money amount;
    private Money feeAmount;
    private WithdrawalStatus status;
    private Optional<String> custodyRef = Optional.empty();
    private Optional<String> txHash     = Optional.empty();
    private Optional<Long>   blockNumber = Optional.empty();
    private int confirmations;
    private Optional<Integer> riskScore = Optional.empty();
    private Optional<String>  riskNote  = Optional.empty();
    private final UUID requestedBy;
    private Optional<UUID> approvedBy = Optional.empty();
    private final Instant requestedAt;
    private Optional<Instant> submittedAt = Optional.empty();
    private Optional<Instant> completedAt = Optional.empty();
    private Optional<UUID> ledgerTxReserveId = Optional.empty();
    private Optional<UUID> ledgerTxSettleId  = Optional.empty();
    private Optional<String> failureCode     = Optional.empty();
    private Optional<String> failureMessage  = Optional.empty();
    private int version;

    public static Withdrawal request(
        MerchantId merchant,
        ChainId chain,
        Address to,
        Money amount,
        Money fee,
        UUID requestedBy
    ) {
        if (!amount.isPositive()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "withdrawal amount must be positive");
        }
        return new Withdrawal(
            IdGenerator.newId(), merchant, chain, to, amount, fee == null ? Money.zero(amount.asset()) : fee,
            WithdrawalStatus.REQUESTED, requestedBy, Instant.now(), 0
        );
    }

    public Withdrawal(UUID id, MerchantId merchantId, ChainId chainId, Address to, Money amount,
                      Money feeAmount, WithdrawalStatus status, UUID requestedBy,
                      Instant requestedAt, int version) {
        this.id           = id;
        this.merchantId   = merchantId;
        this.chainId      = chainId;
        this.toAddress    = to;
        this.amount       = amount;
        this.feeAmount    = feeAmount;
        this.status       = status;
        this.requestedBy  = requestedBy;
        this.requestedAt  = requestedAt;
        this.version      = version;
    }

    // ---- transitions

    public void enterRiskReview(int score, String note) {
        ensure(WithdrawalStatus.REQUESTED);
        this.status     = WithdrawalStatus.RISK_REVIEW;
        this.riskScore  = Optional.of(score);
        this.riskNote   = Optional.ofNullable(note);
        bump();
    }

    public void approve(UUID approverId) {
        if (status != WithdrawalStatus.REQUESTED && status != WithdrawalStatus.RISK_REVIEW) {
            throw new BusinessException(ErrorCode.WITHDRAWAL_INVALID_STATE,
                "approve requires REQUESTED or RISK_REVIEW; got " + status);
        }
        if (approverId.equals(requestedBy)) {
            throw new BusinessException(ErrorCode.WITHDRAWAL_FOUR_EYES_VIOLATION,
                "approver must differ from requester");
        }
        this.approvedBy = Optional.of(approverId);
        this.status     = WithdrawalStatus.APPROVED;
        bump();
    }

    public void reject(String reason) {
        if (status != WithdrawalStatus.REQUESTED && status != WithdrawalStatus.RISK_REVIEW) {
            throw new BusinessException(ErrorCode.WITHDRAWAL_INVALID_STATE,
                "reject requires REQUESTED or RISK_REVIEW; got " + status);
        }
        this.status         = WithdrawalStatus.REJECTED;
        this.failureCode    = Optional.of("REJECTED");
        this.failureMessage = Optional.ofNullable(reason);
        bump();
    }

    public void submitToCustody(String custodyRef) {
        ensure(WithdrawalStatus.APPROVED);
        this.status      = WithdrawalStatus.SUBMITTED;
        this.custodyRef  = Optional.of(custodyRef);
        this.submittedAt = Optional.of(Instant.now());
        bump();
    }

    public void enterConfirming(String txHash, long blockNumber, int confirmations) {
        if (status != WithdrawalStatus.SUBMITTED && status != WithdrawalStatus.CONFIRMING) {
            throw new BusinessException(ErrorCode.WITHDRAWAL_INVALID_STATE,
                "confirming requires SUBMITTED or CONFIRMING; got " + status);
        }
        this.status        = WithdrawalStatus.CONFIRMING;
        this.txHash        = Optional.of(txHash);
        this.blockNumber   = Optional.of(blockNumber);
        this.confirmations = confirmations;
        bump();
    }

    public void complete(int confirmations) {
        ensure(WithdrawalStatus.CONFIRMING);
        this.status        = WithdrawalStatus.COMPLETED;
        this.confirmations = confirmations;
        this.completedAt   = Optional.of(Instant.now());
        bump();
    }

    public void fail(String code, String message) {
        if (status == WithdrawalStatus.COMPLETED || status == WithdrawalStatus.REJECTED) {
            throw new BusinessException(ErrorCode.WITHDRAWAL_INVALID_STATE,
                "cannot fail terminal withdrawal");
        }
        this.status         = WithdrawalStatus.FAILED;
        this.failureCode    = Optional.of(code);
        this.failureMessage = Optional.ofNullable(message);
        bump();
    }

    public void attachReserveLedgerTx(UUID txId) { this.ledgerTxReserveId = Optional.of(txId); bump(); }
    public void attachSettleLedgerTx(UUID txId)  { this.ledgerTxSettleId  = Optional.of(txId); bump(); }

    private void ensure(WithdrawalStatus s) {
        if (status != s) {
            throw new BusinessException(ErrorCode.WITHDRAWAL_INVALID_STATE,
                "expected " + s + ", got " + status);
        }
    }
    private void bump() { this.version++; }

    // ---- getters

    public UUID id()                                   { return id; }
    public MerchantId merchantId()                     { return merchantId; }
    public ChainId chainId()                            { return chainId; }
    public Address toAddress()                          { return toAddress; }
    public Money amount()                               { return amount; }
    public Money feeAmount()                            { return feeAmount; }
    public WithdrawalStatus status()                    { return status; }
    public Optional<String> custodyRef()                { return custodyRef; }
    public Optional<String> txHash()                    { return txHash; }
    public Optional<Long> blockNumber()                 { return blockNumber; }
    public int confirmations()                           { return confirmations; }
    public Optional<Integer> riskScore()                { return riskScore; }
    public Optional<String> riskNote()                  { return riskNote; }
    public UUID requestedBy()                            { return requestedBy; }
    public Optional<UUID> approvedBy()                  { return approvedBy; }
    public Instant requestedAt()                         { return requestedAt; }
    public Optional<Instant> submittedAt()              { return submittedAt; }
    public Optional<Instant> completedAt()              { return completedAt; }
    public Optional<UUID> ledgerTxReserveId()           { return ledgerTxReserveId; }
    public Optional<UUID> ledgerTxSettleId()            { return ledgerTxSettleId; }
    public Optional<String> failureCode()               { return failureCode; }
    public Optional<String> failureMessage()            { return failureMessage; }
    public int version()                                 { return version; }
}
