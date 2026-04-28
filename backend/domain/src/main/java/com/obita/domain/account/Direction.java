package com.obita.domain.account;

/** Debit or credit. Stored as {@code 'D'} / {@code 'C'} in the {@code ledger_entry} table. */
public enum Direction {
    DEBIT('D'),
    CREDIT('C');

    private final char code;

    Direction(char code) { this.code = code; }

    public char code() { return code; }

    public static Direction fromCode(char code) {
        return switch (code) {
            case 'D' -> DEBIT;
            case 'C' -> CREDIT;
            default  -> throw new IllegalArgumentException("invalid direction code: " + code);
        };
    }
}
