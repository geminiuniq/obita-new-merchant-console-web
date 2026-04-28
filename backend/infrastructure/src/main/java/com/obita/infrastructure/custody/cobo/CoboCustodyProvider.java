package com.obita.infrastructure.custody.cobo;

import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;
import com.obita.common.tenancy.MerchantId;
import com.obita.domain.chain.ChainId;
import com.obita.domain.custody.CustodyProvider;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.stream.Stream;

/**
 * Cobo Custody adapter (real-stub).
 *
 * The wiring is in place; implementations TODO the backend team:
 *   1. {@link #issue}        → POST /v1/custody/wallets/new_address
 *   2. {@link #submit}       → POST /v1/custody/transactions/transactions
 *   3. {@link #status}       → GET  /v1/custody/transactions/transactions
 *   4. {@link #snapshot}     → GET  /v1/custody/addresses/list (paged)
 *   5. Webhook signature verification in {@code CoboWebhookController}.
 *
 * Auth scheme: ECDSA secp256k1 signature of {@code method|path|expires|body},
 * header {@code X-Cobo-Signature}. See Cobo docs.
 */
@Component
@ConditionalOnProperty(name = "obita.custody.provider", havingValue = "cobo")
public class CoboCustodyProvider implements CustodyProvider {

    @Override public String name() { return "cobo"; }

    @Override public WalletAddressIssued issue(MerchantId merchant, ChainId chain, AddressPurpose purpose) {
        throw notImplemented("issue");
    }

    @Override public CustodyTxRef submit(TransferIntent intent) {
        throw notImplemented("submit");
    }

    @Override public CustodyTxStatus status(CustodyTxRef ref) {
        throw notImplemented("status");
    }

    @Override public Stream<WalletSnapshot> snapshot(MerchantId merchant) {
        throw notImplemented("snapshot");
    }

    @Override public Capabilities capabilities() {
        return new Capabilities(Set.of(), false, true);   // backend team to fill in real chain support
    }

    private static BusinessException notImplemented(String op) {
        return new BusinessException(ErrorCode.CUSTODY_PROVIDER_ERROR,
            "Cobo " + op + " not yet implemented (real-stub)").with("op", op);
    }
}
