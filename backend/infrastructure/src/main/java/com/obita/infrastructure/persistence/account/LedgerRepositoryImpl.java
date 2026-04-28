package com.obita.infrastructure.persistence.account;

import com.obita.common.money.AssetCode;
import com.obita.domain.account.Direction;
import com.obita.domain.account.LedgerEntry;
import com.obita.domain.account.LedgerRepository;
import com.obita.domain.account.LedgerTx;
import com.obita.domain.account.LedgerTxType;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class LedgerRepositoryImpl implements LedgerRepository {

    private final LedgerMapper mapper;

    public LedgerRepositoryImpl(LedgerMapper mapper) { this.mapper = mapper; }

    @Override public void save(LedgerTx tx) {
        mapper.insertTx(tx.id(), tx.merchantId().value(), tx.txType().name(),
            tx.referenceType(), tx.referenceId(), tx.memo(), tx.createdAt());
        for (var e : tx.entries()) {
            mapper.insertEntry(e.txId(), e.accountId(), e.assetCode().value(),
                String.valueOf(e.direction().code()), e.amount(), e.balanceAfter(), e.createdAt());
        }
        // Constraint trigger fires DEFERRED at commit; if unbalanced, the tx
        // boundary will throw. We've already validated invariants in LedgerTx
        // constructor, so a trigger failure here means a bug.
    }

    @Override public Optional<LedgerTx> findById(UUID id) {
        var row = mapper.selectTx(id);
        if (row == null) return Optional.empty();
        var entries = mapper.selectEntries(id).stream().map(this::toDomainEntry).toList();
        return Optional.of(new LedgerTx(
            row.id, com.obita.common.tenancy.MerchantId.of(row.merchantId),
            LedgerTxType.valueOf(row.txType), row.referenceType, row.referenceId, row.memo,
            row.createdAt, entries));
    }

    @Override public List<LedgerEntry> entriesForAccount(UUID accountId, int limit, Long beforeId) {
        return mapper.selectAccountEntries(accountId, limit, beforeId).stream()
            .map(this::toDomainEntry).toList();
    }

    @Override public Optional<UUID> findByReference(String referenceType, UUID referenceId, LedgerTxType type) {
        return Optional.ofNullable(mapper.findByReference(referenceType, referenceId, type.name()));
    }

    private LedgerEntry toDomainEntry(LedgerEntryRow r) {
        return new LedgerEntry(r.id, r.txId, r.accountId,
            AssetCode.of(r.assetCode), Direction.fromCode(r.direction.charAt(0)),
            r.amount, r.balanceAfter, r.createdAt);
    }
}
