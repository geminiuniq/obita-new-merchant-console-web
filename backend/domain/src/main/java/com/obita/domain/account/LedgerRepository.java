package com.obita.domain.account;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port for ledger persistence. Implemented by infrastructure/MyBatis. */
public interface LedgerRepository {

    /** Persist a tx + all its entries within the caller's transaction. */
    void save(LedgerTx tx);

    Optional<LedgerTx> findById(UUID id);

    /** All entries for an account in chronological order — used by the
     *  account journal endpoint. Caller must paginate at its layer. */
    List<LedgerEntry> entriesForAccount(UUID accountId, int limit, Long beforeId);

    /** Has a tx already been posted for the given (referenceType, referenceId)?
     *  Used by services to avoid double-posting on retries. */
    Optional<UUID> findByReference(String referenceType, UUID referenceId, LedgerTxType type);
}
