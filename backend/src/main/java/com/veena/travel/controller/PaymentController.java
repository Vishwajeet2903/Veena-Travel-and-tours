package com.veena.travel.controller;

import com.veena.travel.dto.PaymentQrResponse;
import com.veena.travel.dto.PaymentStatusResponse;
import com.veena.travel.service.RazorpayQrPaymentService;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
  private final RazorpayQrPaymentService paymentService;

  public PaymentController(RazorpayQrPaymentService paymentService) {
    this.paymentService = paymentService;
  }

  @PostMapping("/bookings/{bookingId}/qr")
  public PaymentQrResponse createPaymentQr(@PathVariable Long bookingId, Principal principal) {
    return paymentService.createQr(bookingId, principal);
  }

  @GetMapping("/bookings/{bookingId}/status")
  public PaymentStatusResponse getPaymentStatus(@PathVariable Long bookingId, Principal principal) {
    return paymentService.checkStatus(bookingId, principal);
  }

}
