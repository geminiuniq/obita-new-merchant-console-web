package com.obita.common.money;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Immutable money value object. {@link BigDecimal} only — never float/double in
 * any class with this type as a field.
 *
 * Equality is value-based on (asset, amount with stripped trailing zeros) so that
 * {@code Money(USDT, 1.50)} equals {@code Money(USDT, 1.5)}. Cross-asset arithmetic
 * is rejected at runtime.
 */
public record Money(AssetCode asset, BigDecimal amount) implements Comparable<Money> {

    public Money {
        Objects.requireNonNull(asset, "asset");
        Objects.requireNonNull(amount, "amount");
    }

    public static Money of(AssetCode asset, BigDecimal amount) { return new Money(asset, amount); }
    public static Money of(AssetCode asset, String amount)     { return new Money(asset, new BigDecimal(amount)); }
    public static Money zero(AssetCode asset)                  { return new Money(asset, BigDecimal.ZERO); }

    public Money plus(Money other) {
        ensureSameAsset(other);
        return new Money(asset, amount.add(other.amount));
    }

    public Money minus(Money other) {
        ensureSameAsset(other);
        return new Money(asset, amount.subtract(other.amount));
    }

    public boolean isPositive() { return amount.signum() > 0; }
    public boolean isZero()     { return amount.signum() == 0; }
    public boolean isNegative() { return amount.signum() < 0; }

    /** Round half-even at the given scale; the canonical financial rounding. */
    public Money roundHalfEven(int scale) {
        return new Money(asset, amount.setScale(scale, RoundingMode.HALF_EVEN));
    }

    private void ensureSameAsset(Money other) {
        if (!asset.equals(other.asset)) {
            throw new IllegalArgumentException(
                "asset mismatch: " + asset + " vs " + other.asset);
        }
    }

    @Override public int compareTo(Money other) {
        ensureSameAsset(other);
        return amount.compareTo(other.amount);
    }

    @Override public boolean equals(Object o) {
        if (!(o instanceof Money m)) return false;
        return asset.equals(m.asset) && amount.compareTo(m.amount) == 0;
    }

    @Override public int hashCode() {
        return Objects.hash(asset, amount.stripTrailingZeros());
    }

    @Override public String toString() {
        return amount.toPlainString() + " " + asset.value();
    }
}
