package com.veena.travel.dto;

import java.math.BigDecimal;

public record PaymentQrResponse(
    Long bookingId,
    String gateway,
    String qrId,
    String imageUrl,
    BigDecimal amount,
    String status,
    String message
) {}
