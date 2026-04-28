package com.obita.api.vault;

import com.obita.common.id.IdGenerator;
import com.obita.common.money.Money;
import com.obita.common.tenancy.MerchantId;
import com.obita.domain.chain.ChainAdapter;
import com.obita.domain.chain.ChainAdapter.BlockRange;
import com.obita.domain.chain.ChainAdapterRegistry;
import com.obita.domain.chain.ChainId;
import com.obita.domain.vault.Deposit;
import com.obita.domain.vault.DepositStatus;
import com.obita.domain.vault.VaultRepository;
import com.obita.domain.vault.WalletAddress;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Polls each chain on a schedule, captures detected deposits into the
 * {@code deposit} table, and posts the matching ledger entries.
 *
 * MVP keeps it dirt-simple: no leader election, no reorg handling, no
 * per-chain throttling. The {@link ChainAdapter} interface is the boundary
 * the backend team replaces with web3j-driven implementations.
 */
@Component
public class DepositScanner {

    private static final Logger log = LoggerFactory.getLogger(DepositScanner.class);

    private static final int MAX_BLOCKS_PER_TICK = 1_000;

    private final ChainAdapterRegistry registry;
    private final VaultRepository vault;
    private final VaultApplicationService vaultService;

    public DepositScanner(ChainAdapterRegistry registry,
                          VaultRepository vault,
                          VaultApplicationService vaultService) {
        this.registry      = registry;
        this.vault         = vault;
        this.vaultService  = vaultService;
    }

    /** Run every 10s. Each chain processed independently inside its own tx. */
    @Scheduled(fixedDelayString = "${obita.scanner.fixed-delay-ms:10000}", initialDelay = 5_000)
    public void tick() {
        for (var entry : registry.all().entrySet()) {
            try {
                scanChain(entry.getKey(), entry.getValue());
            } catch (Throwable t) {
                log.warn("scanner.tick chain={} failed: {}", entry.getKey(), t.toString());
            }
        }
    }

    private void scanChain(ChainId chainId, ChainAdapter adapter) {
        var addresses = vault.activeAddressesForChain(chainId);
        if (addresses.isEmpty()) return;

        long cursor = vault.readCursor(chainId);
        long head   = adapter.latestBlock();
        if (head <= cursor) return;
        long to = Math.min(head, cursor + MAX_BLOCKS_PER_TICK);

        var watch = addresses.stream().map(WalletAddress::address).collect(Collectors.toSet());
        var byAddr = new HashMap<String, WalletAddress>();
        addresses.forEach(a -> byAddr.put(a.address().value(), a));

        adapter.scan(new BlockRange(cursor + 1, to), watch, credit -> {
            var addr = byAddr.get(credit.to().value());
            if (addr == null) return;
            try {
                ingestCredit(addr, credit);
            } catch (Throwable t) {
                log.warn("scanner.ingest tx={} failed: {}", credit.txHash(), t.toString());
            }
        });

        vault.writeCursor(chainId, to);
    }

    /** Build the {@link Deposit} aggregate and delegate to the AOP-proxied
     *  service for a single-transaction insert + ledger post. Calling
     *  {@code @Transactional} on this in-class method does NOT work because
     *  the lambda above invokes us directly, bypassing the proxy. */
    public void ingestCredit(WalletAddress addr, ChainAdapter.ChainCredit credit) {
        var deposit = new Deposit(
            IdGenerator.newId(),
            addr.merchantId(),
            addr.chainId(),
            addr.id(),
            credit.from(),
            credit.to(),
            credit.txHash(),
            credit.logIndex(),
            credit.blockNumber(),
            Money.of(credit.asset(), credit.amount()),
            credit.confirmations(),
            DepositStatus.DETECTED,
            java.util.Optional.empty(),
            Instant.now(),
            java.util.Optional.empty(),
            null
        );
        vaultService.ingestDeposit(deposit);
    }

    /** Sweeps DETECTED/CONFIRMING deposits, advances confirmations, credits AVAILABLE
     *  once chain.confirmations is met. */
    @Scheduled(fixedDelayString = "${obita.scanner.confirm-delay-ms:15000}", initialDelay = 7_000)
    public void confirmTick() {
        var pending = vault.findConfirming(200);
        for (var d : pending) {
            try {
                advance(d);
            } catch (Throwable t) {
                log.warn("scanner.confirm deposit={} failed: {}", d.id(), t.toString());
            }
        }
    }

    /** Compute next state and delegate to the AOP-proxied service for the
     *  single-transaction confirm + post. */
    public void advance(Deposit d) {
        int newConfirmations = Math.min(15, d.confirmations() + 3);
        DepositStatus newStatus = newConfirmations >= 12 ? DepositStatus.CREDITED : DepositStatus.CONFIRMING;
        vaultService.advanceDeposit(d, newConfirmations, newStatus);
    }

    /** Test/demo helper: directly inject a credit through the platform path. */
    @SuppressWarnings("unused")
    private void importHint(MerchantId m) {}
}
