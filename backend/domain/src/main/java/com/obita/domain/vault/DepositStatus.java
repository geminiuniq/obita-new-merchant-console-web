package com.obita.domain.vault;

public enum DepositStatus {
    DETECTED,        // observed on chain, not yet confirmed
    CONFIRMING,      // waiting for chain.confirmations
    CREDITED,        // ledger entry posted to AVAILABLE
    REJECTED         // reorg / dust / blacklisted source
}
