package com.obita.infrastructure.chain.mock;

import com.obita.common.money.AssetCode;
import com.obita.common.money.Money;
import com.obita.domain.chain.Address;
import com.obita.domain.chain.ChainAdapter;
import com.obita.domain.chain.ChainId;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

/**
 * Stand-in chain adapter used for offline demos. Does not talk to a real
 * RPC. The scanner queries it like any other adapter — handy for E2E tests.
 *
 * The {@link #injectCredit(ChainCredit)} hook is for the {@code MockBank}
 * controller and tests to push synthetic deposits into the system.
 */
public class MockEvmChainAdapter implements ChainAdapter {

    private final ChainId chainId;
    private final ConcurrentLinkedDeque<ChainCredit> queued = new ConcurrentLinkedDeque<>();
    private final AtomicLong block = new AtomicLong(1_000_000L);

    public MockEvmChainAdapter(ChainId chainId) { this.chainId = chainId; }

    @Override public ChainId chainId() { return chainId; }

    @Override public long latestBlock() { return block.incrementAndGet(); }

    @Override public void scan(BlockRange range, Set<Address> watch, Consumer<ChainCredit> sink) {
        ChainCredit c;
        while ((c = queued.pollFirst()) != null) {
            if (watch.contains(c.to())) sink.accept(c);
            else queued.addLast(c);                       // not for us; put back (dev-only behavior)
        }
    }

    @Override public BigDecimal balanceOf(Address addr, AssetCode asset) {
        return BigDecimal.ZERO;
    }

    @Override public TxStatus status(String txHash) {
        return new TxStatus(txHash, block.get(), 12, TxStatus.Outcome.CONFIRMED);
    }

    @Override public FeeQuote estimateFee(TransferIntent intent) {
        // mocked tiny fee in the same asset for simplicity
        return new FeeQuote(
            Money.of(intent.asset(), new BigDecimal("0.000100000000000000")),
            Money.of(intent.asset(), BigDecimal.ZERO)
        );
    }

    /** Test/demo hook: push a credit that the next scan() call will surface. */
    public void injectCredit(Address to, AssetCode asset, BigDecimal amount) {
        var credit = new ChainCredit(
            "0x" + UUID.randomUUID().toString().replace("-", ""),
            0,
            block.incrementAndGet(),
            Address.of("0x" + "0".repeat(40)),
            to,
            asset,
            amount,
            12
        );
        queued.add(credit);
    }
}
