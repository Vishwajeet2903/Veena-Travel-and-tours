package com.veena.travel.dto;

public record PaymentStatusResponse(
    Long bookingId,
    String status,
    String paymentId,
    String message
) {}
