package com.obita.api.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "obita.auth")
public record JwtProperties(
    String jwtSecret,
    Duration accessTtl,
    Duration refreshTtl,
    String pepper
) {
    public JwtProperties {
        if (jwtSecret == null || jwtSecret.length() < 64) {
            throw new IllegalStateException(
                "obita.auth.jwt-secret must be at least 64 chars; got " +
                (jwtSecret == null ? "null" : jwtSecret.length() + " chars"));
        }
    }
}
