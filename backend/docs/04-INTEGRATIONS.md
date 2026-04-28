# 04 — Integrations (Providers)

The MVP hides every external dependency behind a **port** (interface) in
`domain`. Each port has:
- a **Mock** adapter in `infrastructure/<area>/mock` for MVP demo,
- a **Real-stub** adapter in `infrastructure/<area>/<vendor>` ready for the
  backend team to fill in (config + API client wired, calls TODO).

Switching providers is a one-line config change in `application.yaml`.

```
obita:
  custody.provider: mock         # mock | cobo | safeheron | fireblocks
  ramp.provider:    mock         # mock | circle | banxa | local-psp
  bridge.provider:  mock         # mock | layerzero | wormhole | squid
```

## 1. ChainAdapter — multi-chain abstraction

```java
public interface ChainAdapter {
    ChainId chainId();

    /** Latest finalised block. */
    long latestBlock();

    /** Subscribe to credit events for the given addresses. Push to consumer. */
    void scan(BlockRange range, Set<Address> watch, Consumer<ChainCredit> sink);

    /** Read native or token balance. */
    BigDecimal balanceOf(Address addr, AssetCode asset);

    /** Look up tx receipt + confirmation count. */
    TxStatus status(String txHash);

    /** Fee estimate for a transfer of (asset, amount, to). */
    FeeQuote estimateFee(TransferIntent intent);
}
```

Implementations:
- `EvmChainAdapter` (web3j) — one class, instantiated per chainId via
  `application.yaml`. Covers ETH, BSC, Polygon, Arbitrum, Optimism, Base.
- `TronChainAdapter` (trident-java) — TRC20.
- `SolanaChainAdapter` — direct JSON-RPC.

The adapter does **not** sign or submit transactions itself — that's
`CustodyProvider`'s job. The split keeps key material out of the chain
package entirely.

### Configuration shape

```yaml
obita:
  chains:
    ETH:
      family: EVM
      network: testnet
      rpc-url: ${OBITA_RPC_ETH}
      confirmations: 12
      gas-price-strategy: eip1559
    BSC:
      family: EVM
      network: testnet
      rpc-url: ${OBITA_RPC_BSC}
      confirmations: 15
    TRON:
      family: TRON
      network: testnet
      rpc-url: ${OBITA_RPC_TRON}
      confirmations: 19
```

## 2. CustodyProvider — wallet creation, signing, broadcasting

This is the **most security-sensitive** interface in the system. The MVP
mocks it; production will integrate with a custody vendor.

```java
public interface CustodyProvider {
    /** Provision a deposit address for (merchant, chain). */
    WalletAddressIssued issue(MerchantId merchant, ChainId chain, AddressPurpose purpose);

    /** Submit a transfer. The provider signs & broadcasts; we get a custody_ref. */
    CustodyTxRef submit(TransferIntent intent);

    /** Poll status. Custody webhooks call back via /webhooks/custody. */
    CustodyTxStatus status(CustodyTxRef ref);

    /** List addresses owned by this custody (for reconciliation). */
    Stream<WalletSnapshot> snapshot(MerchantId merchant);

    /** Provider capabilities (which chains, MPC vs cold, daily limits). */
    CustodyCapabilities capabilities();
}
```

### Mock implementation (`MockCustodyProvider`)
- Generates HD-wallet addresses from a seed stored in `application.yaml`
  (devnet only). The seed never leaves the JVM and is rotated on every
  start in test profile.
- "Submits" transfers by recording them in an in-memory queue; a scheduled
  task transitions them to `CONFIRMED` after a configurable delay
  (default 5s) to mimic chain confirmations.
- Useful for offline UI demo without burning testnet funds.

### Real-stub implementations
- `CoboCustodyProvider` (recommended primary)
  - `Cobo Custody Web3 API` — REST, HMAC-SHA256 signing, IP allowlist.
  - Fields wired: `apiKey`, `apiSecret`, `host`, `walletId`.
  - TODO comments mark the 3 RPCs to implement: `createAddress`,
    `submitTransaction`, `getTransaction`.
- `SafeheronCustodyProvider`
  - MPC, supports both EVM and TRON natively.
  - Webhook signing different from Cobo — note in code.
- `FireblocksCustodyProvider`
  - International alternative. Higher monthly fee.

### Migration path: Mock → Cobo

1. Provision a Cobo Custody **org** + sub-wallets per merchant.
2. Set env: `OBITA_CUSTODY_PROVIDER=cobo`,
   `OBITA_COBO_*` keys.
3. Run `mvn -pl api spring-boot:run`. The mock data in DB stays valid —
   `wallet_address.custody_ref` rows must be back-filled with Cobo's
   wallet IDs (one-time migration script `M0001_migrate_custody_refs.sql`
   placeholder included in `db/src/main/resources/migration-scripts/`).
4. Run reconciliation: `POST /admin/custody/reconcile` — pulls every
   address from Cobo and asserts the DB matches.
5. Flip merchants over one at a time via `merchant.metadata.custodyMode`.

## 3. FiatRampProvider — fiat on/off ramp

```java
public interface FiatRampProvider {
    /** Quote: how much stablecoin will the merchant receive for X CNY? */
    RampQuote quoteIn(FiatAmount fiat, AssetCode targetStable);

    /** Begin an on-ramp: returns hosted-page URL or bank wire instructions. */
    RampSession startIn(PaymentIntentId intent, RampQuote quote);

    /** Quote: how much CNY for X stablecoin? */
    RampQuote quoteOut(StablecoinAmount stable, FiatCode targetFiat);

    /** Begin an off-ramp: returns provider tx ref. */
    RampSession startOut(WithdrawalId withdrawal, RampQuote quote);

    /** Status poll. */
    RampStatus status(RampSessionRef ref);
}
```

### Mock
- Hosts a tiny fake-bank URL `/mock-bank/{sessionId}` returning a button
  to "simulate payment received". Clicking it emits a synthetic webhook
  to `/webhooks/ramp/mock` that completes the flow.
- Off-ramp simulates payout after a configurable delay.

### Real-stub providers
- **Circle Mint** (USDC ↔ USD) — best for international USD flows.
- **Banxa / MoonPay / Transak** — card-funded crypto, KYC included.
- **PingPong / Airwallex / Lianlian** (国内通道) — for CNY flows.
- The interface deliberately models a **session** because every real provider
  has a hosted page or webhook callback step.

### Why a `RampQuote` exists separately

Quotes have a TTL (typically 30s). Locking the rate before user confirmation
prevents slippage abuse. The settlement only commits to the locked rate,
not the live rate at execution time.

## 4. BridgeProvider — cross-chain transfers

The MVP **does not** implement a bridge. It defines the port and ships a
mock that pretends to bridge by debiting source chain and crediting target
chain in the ledger. The backend team picks a real bridge (or aggregator)
in v1.

```java
public interface BridgeProvider {
    /** Quote price + ETA for asset transfer between chains. */
    BridgeQuote quote(BridgeRequest req);

    /** Initiate the bridge. Returns a bridge tx ref. */
    BridgeTxRef initiate(BridgeRequest req, BridgeQuote acceptedQuote);

    /** Status poll. Most bridges expose an explorer-style API. */
    BridgeStatus status(BridgeTxRef ref);

    Set<BridgePair> supportedRoutes();
}
```

### Vendor candidates

| Vendor | Style | Fit |
|---|---|---|
| **Squid Router** | Aggregator over Axelar | Easiest integration; fewest direct integrations |
| **LayerZero v2** | Native messaging; OFT for tokens | Strong if we issue our own token; complex otherwise |
| **Wormhole** | Direct messaging + token bridge | Mature, audited |
| **deBridge** | Liquidity-based | Good for fast paths but liquidity-dependent |
| **Stargate** | Pool-based | Limited route set |

Recommendation: **Squid Router** for v1 because it abstracts away the
choice; revisit once volume is high enough to justify direct integration.

### Why we don't roll our own bridge
- Building a bridge requires running relayers and validators, with multi-sig
  custody of the bridged assets. **Worst class of attack surface in DeFi**;
  >$2B lost across bridges historically.
- Out of scope for this team's risk appetite at MVP stage.

## 5. KYC / AML provider (out of scope but interface stubbed)

```java
public interface KycProvider {
    KycSession start(MerchantId merchant, KycLevel level);
    KycStatus status(KycSessionRef ref);
}
```

Vendor candidates: **Sumsub**, **Persona**, **Onfido**. The Mock returns
`APPROVED` instantly — clearly logged so it's never confused with real
approval.

## 6. Notification & webhook out

```java
public interface OutboundWebhook {
    void deliver(MerchantWebhookEndpoint endpoint, WebhookEvent event);
}
```

Real impl signs payloads with HMAC-SHA256 keyed on a per-merchant secret,
adds `Webhook-Timestamp` and `Webhook-Id`, and retries with exponential
backoff (60s, 5m, 30m, 4h, 1d) before parking in `dead_letter_event`.

## 7. Provider configuration matrix

| Concern | MVP default | Production target |
|---|---|---|
| Custody | `mock` | Cobo Custody (primary) / Safeheron (backup) |
| Fiat ramp (CNY) | `mock` | PingPong / Lianlian |
| Fiat ramp (USD/USDC) | `mock` | Circle Mint |
| Bridge | `mock` | Squid Router |
| KYC | `mock` | Sumsub |
| Chain RPC | public testnet | Alchemy / Infura / QuickNode (paid) |
| Email | `mock` (logs) | SES / Resend |

## 8. Integration test matrix

For every provider port we ship two test classes:
- `XxxContractTest` — tests against the **interface** using the Mock impl.
  Runs on every PR. Defines the behavior contract.
- `XxxLiveTest` — tagged `@Tag("live")`, hits the real provider's sandbox.
  Runs nightly with secrets injected from CI vault.

This way the contract is documented as code and the real impl's
conformance is continuously verified against staging.
