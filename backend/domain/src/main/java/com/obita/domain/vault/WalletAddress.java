package com.obita.domain.vault;

import com.obita.common.tenancy.MerchantId;
import com.obita.domain.chain.Address;
import com.obita.domain.chain.ChainId;
import com.obita.domain.custody.CustodyProvider.AddressPurpose;

import java.time.Instant;
import java.util.UUID;

public record WalletAddress(
    UUID id,
    MerchantId merchantId,
    ChainId chainId,
    Address address,
    String custodyRef,
    String label,
    AddressPurpose purpose,
    String status,                    // ACTIVE | DISABLED
    Instant createdAt
) {
    public boolean isActive() { return "ACTIVE".equals(status); }
}
