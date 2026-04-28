package com.obita.api.account;

import com.obita.common.tenancy.Principal;
import com.obita.domain.account.Account;
import com.obita.domain.account.AccountRepository;
import com.obita.domain.account.AccountType;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/accounts")
@PreAuthorize("hasAnyRole('MERCHANT_OPERATOR','MERCHANT_ADMIN','RISK_REVIEWER')")
@Tag(name = "Accounts")
public class AccountController {

    private final AccountRepository accounts;

    public AccountController(AccountRepository accounts) { this.accounts = accounts; }

    @GetMapping
    @Operation(summary = "List the calling merchant's accounts with current balances")
    public List<AccountDto> list(@AuthenticationPrincipal Principal actor) {
        return accounts.listForMerchant(actor.merchantId()).stream()
            .map(AccountDto::from)
            .toList();
    }

    public record AccountDto(
        UUID id,
        AccountType accountType,
        String assetCode,
        BigDecimal balance,
        String status,
        Instant createdAt
    ) {
        public static AccountDto from(Account.WithBalance wb) {
            var a = wb.account();
            return new AccountDto(
                a.id(),
                a.accountType(),
                a.assetCode().value(),
                wb.balance(),
                a.status(),
                a.createdAt()
            );
        }
    }
}
