package com.obita.infrastructure.config;

import com.obita.domain.chain.ChainAdapterRegistry;
import com.obita.domain.chain.ChainId;
import com.obita.infrastructure.chain.mock.MockEvmChainAdapter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Wires {@link com.obita.domain.chain.ChainAdapter}s for every chain.
 * MVP uses Mock adapters; the backend team replaces these with web3j /
 * trident-java instances per family.
 *
 * Binding strategy: we read a flat {@code chain-list} property to know which
 * IDs to register, then supplement with a MVP-default list. The richer
 * {@code chains} map is reserved for real-adapter config (rpc-url, etc.)
 * the backend team will wire later.
 */
@Configuration
public class ChainConfig {

    private static final Logger log = LoggerFactory.getLogger(ChainConfig.class);

    private static final List<String> DEFAULT_CHAINS = List.of("ETH", "BSC", "POLYGON", "TRON");

    @Bean
    @ConfigurationProperties(prefix = "obita")
    public ChainsProperties chainsProperties() { return new ChainsProperties(); }

    @Bean
    public ChainAdapterRegistry chainAdapterRegistry(ChainsProperties props) {
        var registry = new ChainAdapterRegistry();
        var ids = props.getChainList().isEmpty() ? DEFAULT_CHAINS : props.getChainList();
        for (String id : ids) {
            registry.register(new MockEvmChainAdapter(ChainId.of(id)));
            log.info("chain.registered id={} adapter=mock", id);
        }
        return registry;
    }

    public static class ChainsProperties {
        private List<String> chainList = List.of();
        private Map<String, ChainCfg> chains = new LinkedHashMap<>();
        public List<String> getChainList()             { return chainList; }
        public void setChainList(List<String> v)       { this.chainList = v == null ? List.of() : v; }
        public Map<String, ChainCfg> getChains()       { return chains; }
        public void setChains(Map<String, ChainCfg> v) { this.chains = v == null ? new LinkedHashMap<>() : v; }
    }

    public static class ChainCfg {
        private String family;
        private String network;
        private String rpcUrl;
        private int confirmations;
        public String getFamily()                  { return family; }
        public void setFamily(String v)            { this.family = v; }
        public String getNetwork()                 { return network; }
        public void setNetwork(String v)           { this.network = v; }
        public String getRpcUrl()                  { return rpcUrl; }
        public void setRpcUrl(String v)            { this.rpcUrl = v; }
        public int getConfirmations()              { return confirmations; }
        public void setConfirmations(int v)        { this.confirmations = v; }
    }
}
