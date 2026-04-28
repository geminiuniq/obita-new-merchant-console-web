package com.obita.common.id;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

/**
 * UUID v7 generator. RFC 9562 §5.7 layout:
 *   48 bits unix_ts_ms · 4 bits version (7) · 12 bits rand_a
 *   2 bits variant · 62 bits rand_b
 * Time-ordered IDs keep B-tree inserts sequential, which matters for the
 * append-heavy tables (orders, ledger_tx, audit_log).
 */
public final class IdGenerator {

    private static final SecureRandom RNG = new SecureRandom();

    private IdGenerator() {}

    public static UUID newId() {
        return newIdAt(Instant.now().toEpochMilli());
    }

    static UUID newIdAt(long unixTsMs) {
        byte[] rand = new byte[10];
        RNG.nextBytes(rand);

        long msb = (unixTsMs & 0xFFFFFFFFFFFFL) << 16;
        msb |= 0x7000L;                                    // version = 7
        msb |= ((rand[0] & 0x0FL) << 8) | (rand[1] & 0xFFL);

        long lsb = 0L;
        lsb |= 0x8000000000000000L;                        // variant = 10
        lsb |= ((long) (rand[2] & 0x3F) << 56);
        for (int i = 3; i < 10; i++) {
            lsb |= ((long) (rand[i] & 0xFF) << ((9 - i) * 8));
        }
        return new UUID(msb, lsb);
    }
}
