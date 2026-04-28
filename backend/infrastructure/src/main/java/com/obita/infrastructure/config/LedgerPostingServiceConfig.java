package com.obita.infrastructure.config;

import com.obita.domain.account.AccountRepository;
import com.obita.domain.account.LedgerPostingService;
import com.obita.domain.account.LedgerRepository;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Wires the pure {@link LedgerPostingService} (in domain) as a Spring bean. */
@Configuration
public class LedgerPostingServiceConfig {

    @Bean
    public LedgerPostingService ledgerPostingService(AccountRepository accounts, LedgerRepository ledger) {
        return new LedgerPostingService(accounts, ledger);
    }
}
