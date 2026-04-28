package com.obita.domain.custody;

import com.obita.common.money.Money;
import com.obita.common.tenancy.MerchantId;
import com.obita.domain.chain.Address;
import com.obita.domain.chain.ChainId;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * The single port hiding all key-management. MVP ships a {@code MockCustodyProvider};
 * real-world targets are Cobo Custody / Safeheron / Fireblocks.
 *
 * Calls here are **never** invoked from controllers directly — only from
 * application services inside {@code @Transactional} blocks (the application
 * service holds the matching DB tx so a successful provider call can be
 * paired with a DB row insert in the same logical step).
 */
public interface CustodyProvider {

    /** Provider name used in {@code application.yaml}: {@code "mock"}, {@code "cobo"}, etc. */
    String name();

    WalletAddressIssued issue(MerchantId merchant, ChainId chain, AddressPurpose purpose);

    CustodyTxRef submit(TransferIntent intent);

    CustodyTxStatus status(CustodyTxRef ref);

    /** Reconciliation: list every address this provider knows for a merchant. */
    Stream<WalletSnapshot> snapshot(MerchantId merchant);

    Capabilities capabilities();

    enum AddressPurpose { DEPOSIT, SETTLEMENT, HOT }

    record WalletAddressIssued(
        UUID requestId,                 // application-side correlation id
        ChainId chainId,
        Address address,
        String custodyRef               // opaque key the provider understands
    ) {}

    record TransferIntent(
        UUID withdrawalId,              // links the request to our DB row
        MerchantId merchantId,
        ChainId chainId,
        Address from,
        Address to,
        Money amount,
        Money networkFeeQuote
    ) {}

    record CustodyTxRef(String value) {}

    record CustodyTxStatus(
        CustodyTxRef ref,
        Outcome outcome,
        String txHash,                   // null until the provider broadcasts
        Long blockNumber,
        int confirmations,
        String failureCode,
        String failureMessage
    ) {
        public enum Outcome { SUBMITTED, CONFIRMING, CONFIRMED, FAILED, NOT_FOUND }
    }

    record WalletSnapshot(
        ChainId chainId,
        Address address,
        String custodyRef
    ) {}

    record Capabilities(
        Set<ChainId> chains,
        boolean supportsMpc,
        boolean supportsBatch
    ) {}
}
