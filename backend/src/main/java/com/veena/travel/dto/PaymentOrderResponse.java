package com.veena.travel.dto;

import java.math.BigDecimal;

public record PaymentOrderResponse(
    Long bookingId,
    String gateway,
    String keyId,
    String orderId,
    BigDecimal amount,
    Integer amountInPaise,
    String currency,
    String status,
    String name,
    String description,
    String prefillName,
    String prefillEmail
) {}
