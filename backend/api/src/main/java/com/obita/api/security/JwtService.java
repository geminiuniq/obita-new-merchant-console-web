package com.obita.api.security;

import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;
import com.obita.common.tenancy.MerchantId;
import com.obita.common.tenancy.Principal;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Set;
import java.util.UUID;

/** Issues and validates HS512-signed access tokens. Refresh tokens are
 *  opaque strings stored in Redis (see {@code RefreshTokenStore}). */
@Service
public class JwtService {

    private final JwtProperties props;
    private final SecretKey key;

    public JwtService(JwtProperties props) {
        this.props = props;
        this.key = Keys.hmacShaKeyFor(props.jwtSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String issueAccessToken(UUID userId, MerchantId merchantId, String username, Set<String> roles) {
        var now = Instant.now();
        return Jwts.builder()
            .id(UUID.randomUUID().toString())
            .subject(userId.toString())
            .issuer("obita")
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(props.accessTtl())))
            .claim("mid",   merchantId.toString())
            .claim("uname", username)
            .claim("roles", roles)
            .signWith(key, Jwts.SIG.HS512)
            .compact();
    }

    public Principal verify(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            @SuppressWarnings("unchecked")
            var roles = c.get("roles", java.util.List.class);
            return new Principal(
                UUID.fromString(c.getSubject()),
                MerchantId.of((String) c.get("mid")),
                (String) c.get("uname"),
                roles == null ? Set.of() : Set.copyOf(roles)
            );
        } catch (io.jsonwebtoken.ExpiredJwtException ex) {
            throw new BusinessException(ErrorCode.AUTH_TOKEN_EXPIRED, "access token expired");
        } catch (JwtException | IllegalArgumentException ex) {
            throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "invalid access token");
        }
    }
}
