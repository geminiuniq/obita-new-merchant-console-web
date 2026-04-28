package com.obita.common.money;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Objects;

/** Stable identifier for an asset, e.g. {@code USDT-TRC20}, {@code USDC-ETH}, {@code CNY}. */
public record AssetCode(String value) {

    public AssetCode {
        Objects.requireNonNull(value, "asset code");
        if (value.isBlank() || value.length() > 32) {
            throw new IllegalArgumentException("invalid asset code: " + value);
        }
    }

    @JsonCreator
    public static AssetCode of(String value) { return new AssetCode(value); }

    @Override @JsonValue public String toString() { return value; }
}
