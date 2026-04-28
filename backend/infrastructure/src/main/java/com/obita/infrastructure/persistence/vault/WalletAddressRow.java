package com.obita.infrastructure.persistence.vault;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;


@Data
public class WalletAddressRow {
    public UUID id;
    public UUID merchantId;
    public String chainId;
    public String address;
    public String custodyRef;
    public String label;
    public String purpose;
    public String status;
    public Instant createdAt;
}
