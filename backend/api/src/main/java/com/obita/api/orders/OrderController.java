package com.obita.api.orders;

import com.obita.api.orders.dto.CancelOrderRequest;
import com.obita.api.orders.dto.CreateOrderRequest;
import com.obita.api.orders.dto.CreateRefundRequest;
import com.obita.api.orders.dto.OrderDto;
import com.obita.api.orders.dto.OrderEventDto;
import com.obita.api.orders.dto.RefundDto;
import com.obita.common.idempotency.Idempotent;
import com.obita.common.page.CursorPage;
import com.obita.common.tenancy.Principal;
import com.obita.domain.orders.OrderRepository;
import com.obita.domain.orders.OrderStatus;
import com.obita.domain.orders.PaymentChannel;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/orders")
@PreAuthorize("hasAnyRole('MERCHANT_OPERATOR','MERCHANT_ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Orders")
public class OrderController {

    private final OrderApplicationService service;

    public OrderController(OrderApplicationService service) { this.service = service; }

    @PostMapping
    @Idempotent
    @Operation(summary = "Create order")
    public ResponseEntity<OrderDto> create(@AuthenticationPrincipal Principal actor,
                                           @Valid @RequestBody CreateOrderRequest req) {
        var order = service.create(actor, req);
        var dto = OrderDto.from(order);
        return ResponseEntity.created(URI.create("/v1/orders/" + dto.id())).body(dto);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order by id")
    public OrderDto get(@AuthenticationPrincipal Principal actor, @PathVariable UUID id) {
        return OrderDto.from(service.get(actor, id));
    }

    @GetMapping("/by-no/{merchantOrderNo}")
    @Operation(summary = "Get order by merchant_order_no")
    public OrderDto getByNo(@AuthenticationPrincipal Principal actor, @PathVariable String merchantOrderNo) {
        return OrderDto.from(service.getByNo(actor, merchantOrderNo));
    }

    @GetMapping
    @Operation(summary = "List orders (cursor-paged)")
    public CursorPage<OrderDto> list(@AuthenticationPrincipal Principal actor,
                                     @RequestParam(required = false) OrderStatus status,
                                     @RequestParam(required = false) PaymentChannel channel,
                                     @RequestParam(required = false) Instant from,
                                     @RequestParam(required = false) Instant to,
                                     @RequestParam(defaultValue = "50") int limit,
                                     @RequestParam(required = false) Instant beforeCreatedAt,
                                     @RequestParam(required = false) UUID beforeId) {
        if (limit < 1 || limit > 200) limit = 50;
        var f = new OrderRepository.ListFilters(status, channel, from, to);
        var page = service.list(actor, f, limit, beforeCreatedAt, beforeId);
        var dtos = page.stream().map(OrderDto::from).toList();
        // Construct simple cursor; production code should encode (createdAt,id) in base64.
        String nextCursor = (dtos.size() == limit && !dtos.isEmpty())
            ? dtos.get(dtos.size() - 1).createdAt() + "|" + dtos.get(dtos.size() - 1).id()
            : null;
        return CursorPage.of(dtos, nextCursor);
    }

    // Sub-resource style action verbs. We deliberately avoid the
    // {id}:action pattern because Spring 6's PathPatternParser treats `:`
    // as a matrix-variable separator and rejects POSTs against those URLs
    // unless clients percent-encode — see PROGRESS.md §5 #7.

    @PostMapping("/{id}/cancel")
    @Idempotent
    @Operation(summary = "Cancel order (only before settlement)")
    public OrderDto cancel(@AuthenticationPrincipal Principal actor,
                           @PathVariable UUID id,
                           @RequestBody(required = false) CancelOrderRequest req) {
        var reason = req == null ? null : req.reason();
        return OrderDto.from(service.cancel(actor, id, reason));
    }

    @PostMapping("/{id}/settle")
    @Idempotent
    @Operation(summary = "Settle a paid order — posts AVAILABLE → SETTLEMENT")
    @PreAuthorize("hasRole('MERCHANT_ADMIN')")
    public OrderDto settle(@AuthenticationPrincipal Principal actor, @PathVariable UUID id) {
        return OrderDto.from(service.settle(actor, id));
    }

    @PostMapping("/{id}/mark-paid")
    @Idempotent
    @Operation(summary = "Mark order as paid (test / admin path; production uses webhooks)")
    @PreAuthorize("hasRole('MERCHANT_ADMIN')")
    public OrderDto markPaid(@AuthenticationPrincipal Principal actor, @PathVariable UUID id) {
        return OrderDto.from(service.markPaid(actor, id, "manual"));
    }

    @PostMapping("/{id}/refunds")
    @Idempotent
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create refund (full or partial)")
    @PreAuthorize("hasRole('MERCHANT_ADMIN')")
    public RefundDto refund(@AuthenticationPrincipal Principal actor,
                            @PathVariable UUID id,
                            @Valid @RequestBody CreateRefundRequest req) {
        return RefundDto.from(service.requestRefund(actor, id, req));
    }

    @GetMapping("/{id}/refunds")
    public List<RefundDto> refunds(@AuthenticationPrincipal Principal actor, @PathVariable UUID id) {
        return service.refunds(actor, id).stream().map(RefundDto::from).toList();
    }

    @GetMapping("/{id}/events")
    public List<OrderEventDto> events(@AuthenticationPrincipal Principal actor, @PathVariable UUID id) {
        return service.events(actor, id).stream().map(OrderEventDto::from).toList();
    }
}
