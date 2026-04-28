package com.obita.common.page;

import java.util.List;

/** Cursor-paginated response. The cursor is opaque base64 of (created_at, id). */
public record CursorPage<T>(List<T> data, String nextCursor, boolean hasNext) {

    public static <T> CursorPage<T> of(List<T> data, String nextCursor) {
        return new CursorPage<>(data, nextCursor, nextCursor != null);
    }

    public static <T> CursorPage<T> empty() { return new CursorPage<>(List.of(), null, false); }
}
