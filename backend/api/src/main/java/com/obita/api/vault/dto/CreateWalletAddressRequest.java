package com.obita.api.vault.dto;

import com.obita.domain.chain.ChainId;
import com.obita.domain.custody.CustodyProvider;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateWalletAddressRequest(
    @NotNull ChainId chainId,
    CustodyProvider.AddressPurpose purpose,
    @Size(max = 64) String label
) {}
