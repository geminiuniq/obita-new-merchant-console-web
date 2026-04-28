package com.obita.api.vault;

import com.obita.api.vault.dto.CreateWithdrawalRequest;
import com.obita.api.vault.dto.WithdrawalDto;
import com.obita.common.idempotency.Idempotent;
import com.obita.common.money.Money;
import com.obita.common.tenancy.Principal;
import com.obita.domain.chain.Address;
import com.obita.domain.vault.WithdrawalStatus;

import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/withdrawals")
@Tag(name = "Vault — withdrawals")
public class WithdrawalController {

    private final VaultApplicationService service;

    public WithdrawalController(VaultApplicationService service) { this.service = service; }

    @PostMapping
    @Idempotent
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("hasAnyRole('MERCHANT_OPERATOR','MERCHANT_ADMIN')")
    public ResponseEntity<WithdrawalDto> request(@AuthenticationPrincipal Principal actor,
                                                  @Valid @RequestBody CreateWithdrawalRequest req) {
        var amount = Money.of(req.asset(), req.amount());
        var fee    = req.feeAmount() == null
            ? Money.of(req.asset(), BigDecimal.ZERO)
            : Money.of(req.asset(), req.feeAmount());
        var w = service.requestWithdrawal(actor, req.chainId(), Address.of(req.toAddress()), amount, fee);
        var dto = WithdrawalDto.from(w);
        return ResponseEntity.created(URI.create("/v1/withdrawals/" + dto.id())).body(dto);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MERCHANT_OPERATOR','MERCHANT_ADMIN','RISK_REVIEWER')")
    public List<WithdrawalDto> list(@AuthenticationPrincipal Principal actor,
                                    @RequestParam(required = false) WithdrawalStatus status,
                                    @RequestParam(defaultValue = "50") int limit) {
        return service.listWithdrawals(actor, status, Math.min(200, Math.max(1, limit))).stream()
            .map(WithdrawalDto::from).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MERCHANT_OPERATOR','MERCHANT_ADMIN','RISK_REVIEWER')")
    public WithdrawalDto get(@AuthenticationPrincipal Principal actor, @PathVariable UUID id) {
        return WithdrawalDto.from(service.getWithdrawal(actor, id));
    }

    @PostMapping("/{id}:approve")
    @Idempotent
    @PreAuthorize("hasAnyRole('MERCHANT_ADMIN','RISK_REVIEWER')")
    public WithdrawalDto approve(@AuthenticationPrincipal Principal actor, @PathVariable UUID id) {
        return WithdrawalDto.from(service.approveWithdrawal(actor, id));
    }

    @PostMapping("/{id}:reject")
    @Idempotent
    @PreAuthorize("hasAnyRole('MERCHANT_ADMIN','RISK_REVIEWER')")
    public WithdrawalDto reject(@AuthenticationPrincipal Principal actor,
                                @PathVariable UUID id,
                                @RequestBody(required = false) RejectRequest req) {
        return WithdrawalDto.from(service.rejectWithdrawal(actor, id, req == null ? null : req.reason()));
    }

    public record RejectRequest(String reason) {}
}
