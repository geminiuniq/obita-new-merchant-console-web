package com.obita.common.money;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MoneyTest {

    private static final AssetCode USDT = AssetCode.of("USDT-TRC20");
    private static final AssetCode CNY  = AssetCode.of("CNY");

    @Test void addsSameAsset() {
        var sum = Money.of(USDT, "1.5").plus(Money.of(USDT, "2.25"));
        assertThat(sum).isEqualTo(Money.of(USDT, "3.75"));
    }

    @Test void rejectsCrossAssetArithmetic() {
        assertThatThrownBy(() -> Money.of(USDT, "1").plus(Money.of(CNY, "1")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("asset mismatch");
    }

    @Test void equalityIgnoresTrailingZeros() {
        assertThat(Money.of(USDT, "1.50")).isEqualTo(Money.of(USDT, "1.5"));
        assertThat(Money.of(USDT, "1.50").hashCode())
            .isEqualTo(Money.of(USDT, "1.5").hashCode());
    }

    @Test void roundsHalfEven() {
        // banker's rounding: .5 to even
        assertThat(Money.of(USDT, "0.5").roundHalfEven(0).amount().toPlainString()).isEqualTo("0");
        assertThat(Money.of(USDT, "1.5").roundHalfEven(0).amount().toPlainString()).isEqualTo("2");
        assertThat(Money.of(USDT, "2.5").roundHalfEven(0).amount().toPlainString()).isEqualTo("2");
    }
}
