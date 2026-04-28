package com.obita.api.auth;

import com.obita.api.security.JwtService;
import com.obita.common.audit.Audited;
import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;
import com.obita.common.tenancy.Principal;
import com.obita.domain.merchant.MerchantUserRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1/auth")
@Tag(name = "Auth")
public class AuthController {

    private final MerchantUserRepository users;
    private final PasswordHasher hasher;
    private final JwtService jwt;

    public AuthController(MerchantUserRepository users, PasswordHasher hasher, JwtService jwt) {
        this.users  = users;
        this.hasher = hasher;
        this.jwt    = jwt;
    }

    @PostMapping("/login")
    @Audited(action = "AUTH.LOGIN")
    @Operation(summary = "Login with merchant code + username + password")
    @Transactional
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        var user = users.findByMerchantCodeAndUsername(req.merchantCode(), req.username())
            .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS,
                "invalid credentials"));
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "account suspended");
        }
        if (!hasher.verify(user.passwordHash(), req.password().toCharArray())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "invalid credentials");
        }
        users.touchLastLogin(user.id());
        var token = jwt.issueAccessToken(user.id(), user.merchantId(), user.username(), user.roles());
        return new LoginResponse(token, "bearer", user.username(), user.merchantId().toString(), user.roles());
    }

    @GetMapping("/me")
    @Operation(summary = "Echo the authenticated principal")
    public Map<String, Object> me(@AuthenticationPrincipal Principal p) {
        return Map.of(
            "userId",     p.userId(),
            "merchantId", p.merchantId(),
            "username",   p.username(),
            "roles",      p.roles()
        );
    }

    public record LoginRequest(
        @NotBlank String merchantCode,
        @NotBlank String username,
        @NotBlank String password
    ) {}

    public record LoginResponse(
        String accessToken,
        String tokenType,
        String username,
        String merchantId,
        java.util.Set<String> roles
    ) {}
}
