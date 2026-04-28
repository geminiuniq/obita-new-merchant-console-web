package com.obita.infrastructure.persistence.account;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;


@Data
public class AccountRow {
    public UUID id;
    public UUID merchantId;
    public String accountType;
    public String assetCode;
    public String status;
    public String metadata;
    public Instant createdAt;
}
