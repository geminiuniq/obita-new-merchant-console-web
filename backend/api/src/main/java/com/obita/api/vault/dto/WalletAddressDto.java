package com.obita.api.vault.dto;

import com.obita.domain.chain.ChainId;
import com.obita.domain.custody.CustodyProvider;
import com.obita.domain.vault.WalletAddress;

import java.time.Instant;
import java.util.UUID;

public record WalletAddressDto(
    UUID id,
    ChainId chainId,
    String address,
    String label,
    CustodyProvider.AddressPurpose purpose,
    String status,
    Instant createdAt
) {
    public static WalletAddressDto from(WalletAddress a) {
        return new WalletAddressDto(a.id(), a.chainId(), a.address().value(),
            a.label(), a.purpose(), a.status(), a.createdAt());
    }
}
