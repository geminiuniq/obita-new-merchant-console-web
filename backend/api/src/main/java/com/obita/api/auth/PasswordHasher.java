package com.obita.api.auth;

import com.obita.api.security.JwtProperties;

import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/** Argon2id password hashing with an instance pepper appended. */
@Component
public class PasswordHasher {

    private static final int MEMORY      = 65536;   // 64 MiB
    private static final int ITERATIONS  = 3;
    private static final int PARALLELISM = 2;

    private final Argon2 argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);
    private final String pepper;

    public PasswordHasher(JwtProperties props) { this.pepper = props.pepper(); }

    public String hash(char[] password) {
        char[] peppered = withPepper(password);
        try {
            return argon2.hash(ITERATIONS, MEMORY, PARALLELISM, peppered);
        } finally {
            argon2.wipeArray(peppered);
        }
    }

    public boolean verify(String hash, char[] password) {
        char[] peppered = withPepper(password);
        try {
            return argon2.verify(hash, peppered);
        } finally {
            argon2.wipeArray(peppered);
        }
    }

    private char[] withPepper(char[] password) {
        var p = pepper.toCharArray();
        var combined = new char[password.length + p.length];
        System.arraycopy(password, 0, combined, 0, password.length);
        System.arraycopy(p, 0, combined, password.length, p.length);
        return combined;
    }

    /** Helper used during seed migration generation only. */
    public static byte[] bytes(char[] arr) {
        return new String(arr).getBytes(StandardCharsets.UTF_8);
    }
}
