package com.obita.api.advice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.obita.common.audit.Audited;
import com.obita.common.tenancy.Principal;
import com.obita.infrastructure.audit.AuditMapper;

import jakarta.servlet.http.HttpServletRequest;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

/** Writes one {@code audit_log} row per invocation of an {@link Audited} method,
 *  inside the same DB transaction as the business write. */
@Aspect
@Component
public class AuditAdvice {

    private final AuditMapper auditMapper;
    private final ObjectMapper json;

    public AuditAdvice(AuditMapper auditMapper, ObjectMapper json) {
        this.auditMapper = auditMapper;
        this.json        = json;
    }

    @Around("@annotation(audited)")
    public Object around(ProceedingJoinPoint pjp, Audited audited) throws Throwable {
        Object result;
        String outcome = "OK";
        try {
            result = pjp.proceed();
        } catch (Throwable t) {
            writeRow(audited, "ERROR", null, pjp.getArgs());
            throw t;
        }
        writeRow(audited, outcome, extractResourceId(result), pjp.getArgs());
        return result;
    }

    private void writeRow(Audited audited, String outcome, String resourceId, Object[] args) {
        Principal principal = currentPrincipal();
        HttpServletRequest req = currentRequest();

        String payload;
        try { payload = json.writeValueAsString(args); }
        catch (Exception ex) { payload = "{\"_unencodable\":true}"; }

        auditMapper.insert(
            principal == null ? "SYSTEM" : "USER",
            principal == null ? null : principal.userId(),
            principal == null ? null : principal.merchantId().value(),
            audited.action(),
            audited.resourceType().isEmpty() ? null : audited.resourceType(),
            resourceId,
            req == null ? null : header(req, "X-Request-Id"),
            req == null ? null : remoteAddress(req),
            req == null ? null : header(req, "User-Agent"),
            payload,
            outcome
        );
    }

    private static String extractResourceId(Object result) {
        if (result == null) return null;
        try {
            // Convention: DTOs expose an "id" accessor (record component or getter).
            var m = result.getClass().getMethod("id");
            Object id = m.invoke(result);
            return id == null ? null : id.toString();
        } catch (NoSuchMethodException nsme) {
            return null;
        } catch (Exception ex) {
            return null;
        }
    }

    private static Principal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object p = auth.getPrincipal();
        return p instanceof Principal pr ? pr : null;
    }

    private static HttpServletRequest currentRequest() {
        var attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attrs == null ? null : attrs.getRequest();
    }

    private static String header(HttpServletRequest req, String name) {
        var v = req.getHeader(name);
        return v == null ? null : (v.length() > 512 ? v.substring(0, 512) : v);
    }

    private static String remoteAddress(HttpServletRequest req) {
        var xf = req.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) return xf.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    /** Used to keep imports stable in tests. */
    @SuppressWarnings("unused")
    private void uuidImport(UUID u) {}
}
