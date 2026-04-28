package com.obita.domain.chain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Objects;

/** Stable chain identifier — matches the {@code chain.chain_id} column. */
public record ChainId(String value) {

    public ChainId {
        Objects.requireNonNull(value, "chain id");
        if (value.isBlank() || value.length() > 32) {
            throw new IllegalArgumentException("invalid chain id: " + value);
        }
    }

    @JsonCreator public static ChainId of(String value) { return new ChainId(value); }

    @Override @JsonValue public String toString() { return value; }
}
