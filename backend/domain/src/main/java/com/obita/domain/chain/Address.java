package com.obita.domain.chain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Objects;

/** Generic on-chain address. We do not validate the format here — that's
 *  the {@link com.obita.domain.chain.ChainAdapter}'s job (per-family rules:
 *  EVM 0x..., Tron T..., Solana base58, etc.). */
public record Address(String value) {

    public Address {
        Objects.requireNonNull(value, "address");
        if (value.isBlank() || value.length() > 128) {
            throw new IllegalArgumentException("invalid address: " + value);
        }
    }

    @JsonCreator public static Address of(String v) { return new Address(v); }

    @Override @JsonValue public String toString() { return value; }
}
