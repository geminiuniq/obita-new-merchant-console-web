package com.obita.api.security;

import com.obita.common.error.BusinessException;
import com.obita.common.tenancy.Principal;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/** Resolves the {@code Authorization: Bearer <jwt>} header and populates the
 *  Spring Security context with a {@link Principal} (our domain principal). */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";
    private final JwtService jwt;

    public JwtAuthFilter(JwtService jwt) { this.jwt = jwt; }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
        throws ServletException, IOException {

        var auth = req.getHeader("Authorization");
        if (auth != null && auth.startsWith(BEARER)) {
            try {
                Principal p = jwt.verify(auth.substring(BEARER.length()).trim());
                var authorities = p.roles().stream()
                    .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                    .toList();
                var token = new UsernamePasswordAuthenticationToken(p, null, List.copyOf(authorities));
                token.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                SecurityContextHolder.getContext().setAuthentication(token);
            } catch (BusinessException ex) {
                // Let the entry-point produce the 401; clear context to be safe.
                SecurityContextHolder.clearContext();
                req.setAttribute("authError", ex);
            }
        }
        chain.doFilter(req, res);
    }
}
