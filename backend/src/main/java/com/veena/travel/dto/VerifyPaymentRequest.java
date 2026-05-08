package com.veena.travel.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyPaymentRequest(
    @NotBlank String cashfreeOrderId
) {}
