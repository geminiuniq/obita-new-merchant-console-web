package com.obita.api.vault;

import com.obita.common.money.AssetCode;
import com.obita.domain.chain.Address;
import com.obita.domain.chain.ChainAdapterRegistry;
import com.obita.domain.chain.ChainId;
import com.obita.infrastructure.chain.mock.MockEvmChainAdapter;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Demo helper. Lets the frontend "fund" a watched address via the Mock chain
 * adapter. Disabled when {@code obita.demo.mock-bank=false} (production).
 */
@RestController
@RequestMapping("/mock-bank")
@Tag(name = "Demo — mock bank")
@ConditionalOnProperty(name = "obita.demo.mock-bank", havingValue = "true", matchIfMissing = true)
public class MockBankController {

    private final ChainAdapterRegistry chains;

    public MockBankController(ChainAdapterRegistry chains) { this.chains = chains; }

    @PostMapping("/credit")
    @Operation(summary = "Inject a synthetic on-chain credit toward an address (mock only)")
    public Map<String, Object> credit(@RequestBody CreditRequest req) {
        var adapter = chains.require(req.chainId());
        if (!(adapter instanceof MockEvmChainAdapter mock)) {
            throw new IllegalStateException("only mock adapters support synthetic credits");
        }
        mock.injectCredit(Address.of(req.toAddress()), req.asset(), req.amount());
        return Map.of("status", "queued", "to", req.toAddress(), "amount", req.amount());
    }

    public record CreditRequest(
        @NotNull ChainId chainId,
        @NotNull AssetCode asset,
        @NotBlank String toAddress,
        @NotNull @Positive BigDecimal amount
    ) {}
}
