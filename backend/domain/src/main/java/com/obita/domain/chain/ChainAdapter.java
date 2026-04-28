package com.obita.domain.chain;

import com.obita.common.money.AssetCode;
import com.obita.common.money.Money;

import java.math.BigDecimal;
import java.util.Set;
import java.util.function.Consumer;

/**
 * Multi-chain abstraction. One implementation covers a chain *family*
 * (EVM, TRON, SOLANA), instantiated multiple times for chains in that family.
 *
 * The adapter does **not** sign or submit transactions itself — that lives
 * in {@link com.obita.domain.custody.CustodyProvider}. Keeping the split
 * means key material never enters this package.
 */
public interface ChainAdapter {

    ChainId chainId();

    long latestBlock();

    /** Pull token-transfer-like credit events into the watched address set
     *  for the given block range. The sink is called per credit, in any order;
     *  callers must persist the cursor themselves. */
    void scan(BlockRange range, Set<Address> watch, Consumer<ChainCredit> sink);

    /** Read on-chain balance. Used for reconciliation and address health checks. */
    BigDecimal balanceOf(Address addr, AssetCode asset);

    TxStatus status(String txHash);

    FeeQuote estimateFee(TransferIntent intent);

    record BlockRange(long fromInclusive, long toInclusive) {
        public BlockRange {
            if (toInclusive < fromInclusive) {
                throw new IllegalArgumentException("toInclusive < fromInclusive");
            }
        }
        public long size() { return toInclusive - fromInclusive + 1; }
    }

    /** A credit observed on chain — one transfer or token log. */
    record ChainCredit(
        String txHash,
        int logIndex,
        long blockNumber,
        Address from,
        Address to,
        AssetCode asset,
        BigDecimal amount,
        int confirmations
    ) {}

    /** Status of a tx the custody system says it broadcast. */
    record TxStatus(
        String txHash,
        Long blockNumber,
        int confirmations,
        Outcome outcome
    ) {
        public enum Outcome { PENDING, CONFIRMED, FAILED, NOT_FOUND }
    }

    /** Read-only intent used for fee quoting. */
    record TransferIntent(
        ChainId chain,
        AssetCode asset,
        Address from,
        Address to,
        BigDecimal amount
    ) {}

    record FeeQuote(Money networkFee, Money serviceFee) {}
}
