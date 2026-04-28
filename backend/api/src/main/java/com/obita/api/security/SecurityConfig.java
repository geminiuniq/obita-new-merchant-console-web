package com.obita.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.LinkedHashMap;
import java.util.Map;

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           JwtAuthFilter jwtAuthFilter,
                                           ObjectMapper objectMapper) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
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

    private static void writeJson(HttpServletResponse res, ObjectMapper om, int status,
                                  ErrorCode code, String message) throws java.io.IOException {
        res.setStatus(status);
        res.setContentType("application/json;charset=UTF-8");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code.name());
        body.put("message", message);
        om.writeValue(res.getOutputStream(), body);
    }

    /** No-op placeholder for {@code BusinessException} so Spring DI can detect it
     *  (the actual handler is in {@link com.obita.api.advice.GlobalExceptionHandler}). */
    @SuppressWarnings("unused")
    private void touch(BusinessException ex) {}
}
