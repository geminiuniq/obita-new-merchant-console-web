package com.obita.api.vault;

import com.obita.api.vault.dto.CreateWalletAddressRequest;
import com.obita.api.vault.dto.WalletAddressDto;
import com.obita.common.idempotency.Idempotent;
import com.obita.common.tenancy.Principal;
import com.obita.domain.custody.CustodyProvider;

import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/v1/wallet-addresses")
@PreAuthorize("hasAnyRole('MERCHANT_OPERATOR','MERCHANT_ADMIN')")
@Tag(name = "Vault — wallet addresses")
public class WalletAddressController {

    private final VaultApplicationService service;

    public WalletAddressController(VaultApplicationService service) { this.service = service; }

    @GetMapping
    public List<WalletAddressDto> list(@AuthenticationPrincipal Principal actor) {
        return service.listAddresses(actor).stream().map(WalletAddressDto::from).toList();
    }

    @PostMapping
    @Idempotent
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<WalletAddressDto> provision(@AuthenticationPrincipal Principal actor,
                                                      @Valid @RequestBody CreateWalletAddressRequest req) {
        var purpose = req.purpose() == null ? CustodyProvider.AddressPurpose.DEPOSIT : req.purpose();
        var addr = service.provisionAddress(actor, req.chainId(), purpose, req.label());
        var dto = WalletAddressDto.from(addr);
        return ResponseEntity.created(URI.create("/v1/wallet-addresses/" + dto.id())).body(dto);
    }
}
