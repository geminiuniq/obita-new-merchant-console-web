package com.obita.domain.chain;

import com.obita.common.error.BusinessException;
import com.obita.common.error.ErrorCode;

import java.util.HashMap;
import java.util.Map;

/** Look-up service mapping {@link ChainId} → {@link ChainAdapter}. Built once
 *  by infrastructure config from {@code obita.chains.*} entries. */
public final class ChainAdapterRegistry {

    private final Map<ChainId, ChainAdapter> adapters = new HashMap<>();

    public ChainAdapterRegistry register(ChainAdapter adapter) {
        adapters.put(adapter.chainId(), adapter);
        return this;
    }

    public ChainAdapter require(ChainId chainId) {
        var a = adapters.get(chainId);
        if (a == null) {
            throw new BusinessException(ErrorCode.CHAIN_UNSUPPORTED,
                "no adapter for chain " + chainId).with("chainId", chainId.value());
        }
        return a;
    }

    public Map<ChainId, ChainAdapter> all() { return Map.copyOf(adapters); }
}
