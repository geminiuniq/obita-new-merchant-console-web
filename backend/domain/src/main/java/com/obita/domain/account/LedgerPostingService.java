package com.obita.domain.account;

import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;
import com.obita.common.id.IdGenerator;
import com.obita.common.money.Money;
import com.obita.common.tenancy.MerchantId;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Domain service that turns "move {@code Money} from A to B" into a balanced
 * {@link LedgerTx}. Pure: takes repository ports, never reaches into Spring or
 * MyBatis directly.
 *
 * Always invoked inside a DB transaction (the application service is
 * {@code @Transactional}). Acquires {@code SELECT ... FOR UPDATE} on every
 * touched account before posting.
 */
public class LedgerPostingService {

    /** Special merchant id for the platform itself. Its accounts represent the
     *  "other side" of every customer flow — they hold assets and bear
     *  liabilities, and are explicitly allowed to go below zero. */
    public static final UUID PLATFORM_MERCHANT_ID =
        UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final AccountRepository accounts;
    private final LedgerRepository ledger;

    public LedgerPostingService(AccountRepository accounts, LedgerRepository ledger) {
        this.accounts = accounts;
        this.ledger = ledger;
    }

    /**
     * Post a 2-leg transfer: debit one account, credit another, same asset.
     * The most common shape — covers ~80% of money flows in the system.
     */
    public LedgerTx postTransfer(
        MerchantId merchant,
        LedgerTxType type,
        UUID debitAccountId,
        UUID creditAccountId,
        Money amount,
        String referenceType,
        UUID referenceId,
        String memo
    ) {
        if (!amount.isPositive()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "amount must be positive");
        }
        if (debitAccountId.equals(creditAccountId)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "debit and credit accounts must differ");
        }

        // Lock both accounts in id order to avoid deadlocks under concurrent posts.
        var ordered = debitAccountId.compareTo(creditAccountId) < 0
            ? new UUID[] { debitAccountId, creditAccountId }
            : new UUID[] { creditAccountId, debitAccountId };

        Account.WithBalance debit  = lock(ordered[0]);
        Account.WithBalance credit = lock(ordered[1]);
        if (!ordered[0].equals(debitAccountId)) { var t = debit; debit = credit; credit = t; }

        var debitNew  = debit.balance().subtract(amount.amount());
        if (debitNew.signum() < 0 && !isPlatform(debit.account())) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_BALANCE,
                "account " + debitAccountId + " would go negative")
                .with("accountId", debitAccountId)
                .with("currentBalance", debit.balance().toPlainString())
                .with("attempted", amount.amount().toPlainString());
        }
        var creditNew = credit.balance().add(amount.amount());

        var txId = IdGenerator.newId();
        var now = Instant.now();
        List<LedgerEntry> entries = new ArrayList<>(2);
        entries.add(new LedgerEntry(null, txId, debitAccountId,  amount.asset(), Direction.DEBIT,  amount.amount(), debitNew,  now));
        entries.add(new LedgerEntry(null, txId, creditAccountId, amount.asset(), Direction.CREDIT, amount.amount(), creditNew, now));

        var tx = new LedgerTx(txId, merchant, type, referenceType, referenceId, memo, now, entries);
        ledger.save(tx);
        return tx;
    }

    /**
     * Multi-leg post — supply the entries directly. Use for fee splits, refunds
     * with rounding remainders, etc. Caller is responsible for ensuring the
     * accounts are reachable from this merchant; we still verify balance
     * constraints here.
     */
    public LedgerTx postMultiLeg(
        MerchantId merchant,
        LedgerTxType type,
        List<LegSpec> legs,
        String referenceType,
        UUID referenceId,
        String memo
    ) {
        if (legs == null || legs.size() < 2) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "multi-leg requires >= 2 legs");
        }
        var debit  = BigDecimal.ZERO;
        var credit = BigDecimal.ZERO;
        for (var leg : legs) {
            if (leg.direction() == Direction.DEBIT) debit  = debit.add(leg.amount().amount());
            else                                    credit = credit.add(leg.amount().amount());
        }
        if (debit.compareTo(credit) != 0) {
            throw new BusinessException(ErrorCode.LEDGER_UNBALANCED,
                "legs unbalanced: D=" + debit + " C=" + credit);
        }

        // Sort by accountId for deterministic lock order.
        var sorted = legs.stream().sorted((a, b) -> a.accountId().compareTo(b.accountId())).toList();
        var entries = new ArrayList<LedgerEntry>(sorted.size());
        var txId = IdGenerator.newId();
        var now = Instant.now();

        for (var leg : sorted) {
            var locked = lock(leg.accountId());
            BigDecimal newBalance = leg.direction() == Direction.DEBIT
                ? locked.balance().subtract(leg.amount().amount())
                : locked.balance().add(leg.amount().amount());
            if (newBalance.signum() < 0 && !isPlatform(locked.account())) {
                throw new BusinessException(ErrorCode.INSUFFICIENT_BALANCE,
                    "account " + leg.accountId() + " would go negative");
            }
            entries.add(new LedgerEntry(null, txId, leg.accountId(),
                leg.amount().asset(), leg.direction(), leg.amount().amount(),
                newBalance, now));
        }

        var tx = new LedgerTx(txId, merchant, type, referenceType, referenceId, memo, now, entries);
        ledger.save(tx);
        return tx;
    }

    private Account.WithBalance lock(UUID accountId) {
        var locked = accounts.lockAndGetBalance(accountId);
        if (locked == null) {
            throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND, "account " + accountId + " not found");
        }
        return locked;
    }

    private static boolean isPlatform(Account a) {
        return PLATFORM_MERCHANT_ID.equals(a.merchantId().value());
    }

    /** Helper for {@link #postMultiLeg}. */
    public record LegSpec(UUID accountId, Direction direction, Money amount) {
        public static LegSpec debit(UUID id, Money m)  { return new LegSpec(id, Direction.DEBIT,  m); }
        public static LegSpec credit(UUID id, Money m) { return new LegSpec(id, Direction.CREDIT, m); }
    }
}
