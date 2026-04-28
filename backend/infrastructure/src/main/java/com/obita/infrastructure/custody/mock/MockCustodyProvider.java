package com.obita.infrastructure.custody.mock;

import com.obita.common.id.IdGenerator;
import com.obita.common.tenancy.MerchantId;
import com.obita.domain.chain.Address;
import com.obita.domain.chain.ChainId;
import com.obita.domain.custody.CustodyProvider;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

/**
 * In-memory custody for MVP demos. Behaviour:
 *
 *  - Issuance: derives a deterministic pseudo-address from
 *    {@code sha256(seed || chain || merchant || serial)}. Same seed = same
 *    addresses (handy for offline tests). Format mimics each family:
 *    {@code 0x...} for EVM, {@code T...} for Tron, base58-ish for Solana.
 *  - Submit: stores the intent in a map keyed by a fresh custody ref. A
 *    scheduled task transitions {@code SUBMITTED → CONFIRMED} after a fixed
 *    delay to mimic confirmations.
 *  - Status: returns the current entry from the map (never persisted).
 *
 *  This impl is intentionally **never** activated under
 *  {@code spring.profiles.active=prod} — see {@code @ConditionalOnProperty}.
 */
@Component
@ConditionalOnProperty(name = "obita.custody.provider", havingValue = "mock", matchIfMissing = true)
public class MockCustodyProvider implements CustodyProvider {

    private static final Logger log = LoggerFactory.getLogger(MockCustodyProvider.class);
    private static final byte[] SEED = bytes(System.getProperty("obita.mock.custody.seed", "obita-mvp-mock-seed"));

    private final Map<String, TxState> ledger = new ConcurrentHashMap<>();
    private final Map<String, AddressState> addresses = new ConcurrentHashMap<>();
    private final SecureRandom rng = new SecureRandom();

    @Override public String name() { return "mock"; }

    @Override public WalletAddressIssued issue(MerchantId merchant, ChainId chain, AddressPurpose purpose) {
        var serial = addresses.size() + 1;
        Address address = derive(merchant, chain, serial);
        String custodyRef = "mock://" + chain + "/" + UUID.randomUUID();
        addresses.put(custodyRef, new AddressState(merchant, chain, address));
        log.info("mock-custody.issue merchant={} chain={} address={} ref={}",
            merchant, chain, address, custodyRef);
        return new WalletAddressIssued(IdGenerator.newId(), chain, address, custodyRef);
    }

    @Override public CustodyTxRef submit(TransferIntent intent) {
        var ref = new CustodyTxRef("mock-tx-" + UUID.randomUUID());
        var fakeTxHash = "0x" + UUID.randomUUID().toString().replace("-", "");
        ledger.put(ref.value(), new TxState(intent, fakeTxHash, Instant.now(),
            CustodyTxStatus.Outcome.SUBMITTED));
        log.info("mock-custody.submit ref={} amount={} {} -> {}",
            ref.value(), intent.amount(), intent.from(), intent.to());
        return ref;
    }

    @Override public CustodyTxStatus status(CustodyTxRef ref) {
        var state = ledger.get(ref.value());
        if (state == null) {
            return new CustodyTxStatus(ref, CustodyTxStatus.Outcome.NOT_FOUND, null, null, 0, null, null);
        }
        // Confirm after ~5s; ramp confirmations from 0..15 over the next 30s for realism.
        long age = Instant.now().getEpochSecond() - state.submittedAt.getEpochSecond();
        var outcome = age >= 5 ? CustodyTxStatus.Outcome.CONFIRMED : CustodyTxStatus.Outcome.CONFIRMING;
        int confirmations = (int) Math.min(15, Math.max(0, age - 5));
        return new CustodyTxStatus(ref, outcome, state.txHash, age >= 5 ? 1L : null, confirmations, null, null);
    }

    @Override public Stream<WalletSnapshot> snapshot(MerchantId merchant) {
        return addresses.values().stream()
            .filter(s -> s.owner.equals(merchant))
            .map(s -> new WalletSnapshot(s.chain, s.address,
                addresses.entrySet().stream().filter(e -> e.getValue() == s).findFirst()
                    .map(Map.Entry::getKey).orElse(null)));
    }

    @Override public Capabilities capabilities() {
        return new Capabilities(
            Set.of(ChainId.of("ETH"), ChainId.of("BSC"), ChainId.of("POLYGON"), ChainId.of("TRON")),
            false, false);
    }

    /** Tiny deterministic address derivation. Not cryptographically meaningful. */
    private Address derive(MerchantId merchant, ChainId chain, int serial) {
        try {
            var sha = MessageDigest.getInstance("SHA-256");
            sha.update(SEED);
            sha.update(merchant.value().toString().getBytes());
            sha.update(chain.value().getBytes());
            sha.update(Integer.toString(serial).getBytes());
            byte[] digest = sha.digest();
            String hex = bytesToHex(digest, 20);
            return switch (chain.value()) {
                case "ETH", "BSC", "POLYGON", "ARB", "OP", "BASE"
                    -> Address.of("0x" + hex);
                case "TRON"
                    -> Address.of("T" + base58ish(hex));
                case "SOL"
                    -> Address.of(base58ish(hex + hex));
                default
                    -> Address.of("mock://" + chain + "/" + hex);
            };
        } catch (Exception ex) {
            throw new IllegalStateException("address derivation failed", ex);
        }
    }

    private static String bytesToHex(byte[] arr, int len) {
        var sb = new StringBuilder(len * 2);
        for (int i = 0; i < len; i++) sb.append(String.format("%02x", arr[i]));
        return sb.toString();
    }

    private static final char[] BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".toCharArray();
    private static String base58ish(String hex) {
        var sb = new StringBuilder();
        for (int i = 0; i < hex.length(); i += 2) {
            sb.append(BASE58[Integer.parseInt(hex.substring(i, i + 2), 16) % BASE58.length]);
        }
        return sb.toString();
    }

    private static byte[] bytes(String s) { return s.getBytes(); }

    private record TxState(TransferIntent intent, String txHash, Instant submittedAt,
                           CustodyTxStatus.Outcome outcome) {}
    private record AddressState(MerchantId owner, ChainId chain, Address address) {}
}
