package com.obita.common.tenancy;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Objects;
import java.util.UUID;

/** Strongly-typed wrapper around a merchant's primary key UUID. */
public record MerchantId(UUID value) {

    public MerchantId { Objects.requireNonNull(value, "merchant id"); }

    @JsonCreator public static MerchantId of(UUID value)   { return new MerchantId(value); }
    public static MerchantId of(String value)              { return new MerchantId(UUID.fromString(value)); }

    @Override @JsonValue public String toString() { return value.toString(); }
}
