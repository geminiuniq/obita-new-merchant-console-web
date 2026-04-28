package com.obita.infrastructure.persistence.merchant;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;


@Data
public class MerchantUserRow {
    public UUID id;
    public UUID merchantId;
    public String username;
    public String passwordHash;
    public String[] roles;
    public Boolean mfaEnabled;
    public String status;
    public Instant lastLoginAt;
}
