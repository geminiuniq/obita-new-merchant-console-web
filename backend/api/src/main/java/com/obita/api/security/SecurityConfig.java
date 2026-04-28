package com.obita.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           JwtAuthFilter jwtAuthFilter,
                                           @Qualifier("corsConfigurationSource") CorsConfigurationSource corsSource,
                                           ObjectMapper objectMapper) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsSource))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(reg -> reg
                .requestMatchers(
                    "/v1/auth/login", "/v1/auth/refresh",
                    "/actuator/health", "/actuator/info", "/actuator/prometheus",
                    "/v3/api-docs", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**",
                    "/webhooks/**", "/mock-bank/**"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(eh -> {
                eh.authenticationEntryPoint((req, res, ex) -> writeJson(res, objectMapper,
                    HttpServletResponse.SC_UNAUTHORIZED, ErrorCode.UNAUTHORIZED, "authentication required"));
                eh.accessDeniedHandler((req, res, ex) -> writeJson(res, objectMapper,
                    HttpServletResponse.SC_FORBIDDEN, ErrorCode.FORBIDDEN, "access denied"));
            })
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    /**
     * CORS for local dev. Origins are configurable via
     * {@code obita.cors.allowed-origins} (comma-separated). Defaults cover the
     * usual static-server ports developers reach for. Production should
     * tighten this to the known frontend hostnames only.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
        @Value("${obita.cors.allowed-origins:http://localhost:5173,http://localhost:5500,http://localhost:8000,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5500,http://127.0.0.1:8000,http://127.0.0.1:3000}")
        String allowedOriginsCsv
    ) {
        var cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(Arrays.asList(allowedOriginsCsv.split("\\s*,\\s*")));
        cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of(
            "Authorization", "Content-Type", "Idempotency-Key",
            "X-Request-Id", "Accept"
        ));
        cfg.setExposedHeaders(List.of("X-Request-Id", "Location"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    private static void writeJson(HttpServletResponse res, ObjectMapper om, int status,
                                  ErrorCode code, String message) throws java.io.IOException {
        res.setStatus(status);
        res.setContentType("application/json;charset=UTF-8");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code.name());
        body.put("message", message);
        om.writeValue(res.getOutputStream(), body);
    }

    @SuppressWarnings("unused")
    private void touch(BusinessException ex) {}
}
