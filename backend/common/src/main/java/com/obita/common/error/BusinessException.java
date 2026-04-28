package com.obita.common.error;

import java.util.LinkedHashMap;
import java.util.Map;

/** Base class for all expected, client-meaningful failures. Throwing this is fine. */
public class BusinessException extends RuntimeException {

    private final ErrorCode code;
    private final Map<String, Object> details = new LinkedHashMap<>();

    public BusinessException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public BusinessException(ErrorCode code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public BusinessException with(String key, Object value) {
        details.put(key, value);
        return this;
    }

    public ErrorCode code()                 { return code; }
    public Map<String, Object> details()    { return details; }

    public static BusinessException notFound(String what)        { return new BusinessException(ErrorCode.NOT_FOUND, what + " not found"); }
    public static BusinessException forbidden(String reason)     { return new BusinessException(ErrorCode.FORBIDDEN, reason); }
    public static BusinessException conflict(ErrorCode c, String m) { return new BusinessException(c, m); }
    public static BusinessException invalid(ErrorCode c, String m)  { return new BusinessException(c, m); }
}
