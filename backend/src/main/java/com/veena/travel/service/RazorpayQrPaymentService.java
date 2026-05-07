package com.veena.travel.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.veena.travel.dto.PaymentQrResponse;
import com.veena.travel.dto.PaymentStatusResponse;
import com.veena.travel.model.Booking;
import com.veena.travel.model.BookingStatus;
import com.veena.travel.repository.BookingRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RazorpayQrPaymentService {
  private static final String PAYMENT_PENDING = "PENDING";
  private static final String PAYMENT_SUCCESS = "SUCCESS";
  private static final String PAYMENT_FAILED = "FAILED";
  private static final String GATEWAY_RAZORPAY_UPI_QR = "RAZORPAY_UPI_QR";
  private static final String GATEWAY_MANUAL_UPI_QR = "MANUAL_UPI_QR";
  private static final String FALLBACK_QR_IMAGE_URL = "/upi-qr-only.jpeg";

  private final BookingRepository bookingRepository;
  private final EmailService emailService;
  private final RestClient restClient;
  private final ObjectMapper objectMapper;
  private final String keyId;
  private final String keySecret;

  public RazorpayQrPaymentService(
      BookingRepository bookingRepository,
      EmailService emailService,
      RestClient.Builder restClientBuilder,
      ObjectMapper objectMapper,
      @Value("${app.razorpay.key-id:}") String keyId,
      @Value("${app.razorpay.key-secret:}") String keySecret
  ) {
    this.bookingRepository = bookingRepository;
    this.emailService = emailService;
    this.restClient = restClientBuilder.baseUrl("https://api.razorpay.com/v1").build();
    this.objectMapper = objectMapper;
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  public PaymentQrResponse createQr(Long bookingId, Principal principal) {
    var booking = findUserBooking(bookingId, principal);
    var amount = payableAmount(booking);

    if (!hasGatewayConfig()) {
      return createManualQr(booking, amount, "Razorpay credentials are not configured. Use the manual UPI QR to complete payment.");
    }

    var amountInPaise = amount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValueExact();

    var body = Map.of(
        "type", "upi_qr",
        "name", "Romify Booking " + booking.getId(),
        "usage", "single_use",
        "fixed_amount", true,
        "payment_amount", amountInPaise,
        "description", "Romify " + booking.getProductType() + " booking",
        "close_by", Instant.now().plusSeconds(1800).getEpochSecond(),
        "notes", Map.of("booking_id", booking.getId().toString())
    );

    JsonNode response;
    try {
      response = restClient.post()
          .uri("/payments/qr_codes")
          .header(HttpHeaders.AUTHORIZATION, basicAuthHeader())
          .body(body)
          .retrieve()
          .body(JsonNode.class);
    } catch (RestClientResponseException exception) {
      if (isQrApiUnavailable(exception)) {
        return createManualQr(booking, amount, "Razorpay UPI QR API is not enabled for this account. Use the manual UPI QR, or enable QR Codes API in Razorpay.");
      }
      throw gatewayException(exception);
    }

    if (response == null || response.path("id").isMissingNode() || response.path("image_url").isMissingNode()) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Payment gateway did not return a QR code.");
    }

    booking.setPaymentGateway(GATEWAY_RAZORPAY_UPI_QR);
    booking.setPaymentQrId(response.path("id").asText());
    booking.setPaymentQrImageUrl(response.path("image_url").asText());
    booking.setPaymentStatus(PAYMENT_PENDING);
    booking.setStatus(BookingStatus.PENDING);
    bookingRepository.save(booking);

    return new PaymentQrResponse(
        booking.getId(),
        GATEWAY_RAZORPAY_UPI_QR,
        booking.getPaymentQrId(),
        booking.getPaymentQrImageUrl(),
        amount,
        PAYMENT_PENDING,
        "Scan the QR code. The amount will open automatically in the UPI app."
    );
  }

  public PaymentStatusResponse checkStatus(Long bookingId, Principal principal) {
    var booking = findUserBooking(bookingId, principal);

    if (PAYMENT_SUCCESS.equals(booking.getPaymentStatus())) {
      return new PaymentStatusResponse(booking.getId(), PAYMENT_SUCCESS, booking.getPaymentId(), "Payment successful. Ticket email already sent.");
    }

    if (GATEWAY_MANUAL_UPI_QR.equals(booking.getPaymentGateway())) {
      return new PaymentStatusResponse(booking.getId(), PAYMENT_PENDING, null, "Manual UPI QR payments cannot be verified automatically. Confirm the payment manually after it is received.");
    }

    requireGatewayConfig();

    if (booking.getPaymentQrId() == null || booking.getPaymentQrId().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Create a payment QR before checking payment status.");
    }

    JsonNode response;
    try {
      response = restClient.get()
          .uri("/payments/qr_codes/{qrId}/payments?count=10", booking.getPaymentQrId())
          .header(HttpHeaders.AUTHORIZATION, basicAuthHeader())
          .retrieve()
          .body(JsonNode.class);
    } catch (RestClientResponseException exception) {
      throw gatewayException(exception);
    }

    var expectedAmount = payableAmount(booking)
        .multiply(BigDecimal.valueOf(100))
        .setScale(0, RoundingMode.HALF_UP)
        .intValueExact();

    var items = response == null ? null : response.path("items");
    if (items != null && items.isArray()) {
      for (JsonNode payment : items) {
        var status = payment.path("status").asText();
        var amount = payment.path("amount").asInt();

        if ("captured".equalsIgnoreCase(status) && amount == expectedAmount) {
          booking.setPaymentStatus(PAYMENT_SUCCESS);
          booking.setStatus(BookingStatus.CONFIRMED);
          booking.setPaymentId(payment.path("id").asText());
          var savedBooking = bookingRepository.save(booking);
          emailService.sendTicketEmail(savedBooking);
          return new PaymentStatusResponse(savedBooking.getId(), PAYMENT_SUCCESS, savedBooking.getPaymentId(), "Payment successful. Booking ticket has been emailed.");
        }

        if ("failed".equalsIgnoreCase(status)) {
          booking.setPaymentStatus(PAYMENT_FAILED);
          booking.setStatus(BookingStatus.CANCELLED);
          booking.setPaymentId(payment.path("id").asText());
          bookingRepository.save(booking);
          return new PaymentStatusResponse(booking.getId(), PAYMENT_FAILED, booking.getPaymentId(), "Payment failed. Please create a new payment QR and try again.");
        }
      }
    }

    return new PaymentStatusResponse(booking.getId(), PAYMENT_PENDING, null, "Payment is still pending. Complete the UPI payment and check again.");
  }

  private Booking findUserBooking(Long bookingId, Principal principal) {
    var booking = bookingRepository.findByIdWithUser(bookingId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found."));

    if (!booking.getUser().getEmail().equals(principal.getName())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this booking payment.");
    }

    return booking;
  }

  private BigDecimal payableAmount(Booking booking) {
    var unitPrice = booking.getPrice() == null ? BigDecimal.ZERO : booking.getPrice();
    var count = booking.getPassengers() != null ? booking.getPassengers() : booking.getGuests();
    return unitPrice.multiply(BigDecimal.valueOf(Math.max(1, count == null ? 1 : count)));
  }

  private void requireGatewayConfig() {
    if (!hasGatewayConfig()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Razorpay credentials are not configured.");
    }
  }

  private boolean hasGatewayConfig() {
    if (keyId.isBlank() || keySecret.isBlank() || keyId.startsWith("rzp_test_xxx")) {
      return false;
    }
    return true;
  }

  private PaymentQrResponse createManualQr(Booking booking, BigDecimal amount, String message) {
    booking.setPaymentGateway(GATEWAY_MANUAL_UPI_QR);
    booking.setPaymentQrId("manual-" + booking.getId());
    booking.setPaymentQrImageUrl(FALLBACK_QR_IMAGE_URL);
    booking.setPaymentStatus(PAYMENT_PENDING);
    booking.setStatus(BookingStatus.PENDING);
    bookingRepository.save(booking);

    return new PaymentQrResponse(
        booking.getId(),
        GATEWAY_MANUAL_UPI_QR,
        booking.getPaymentQrId(),
        booking.getPaymentQrImageUrl(),
        amount,
        PAYMENT_PENDING,
        message
    );
  }

  private String basicAuthHeader() {
    var token = Base64.getEncoder().encodeToString((keyId + ":" + keySecret).getBytes(StandardCharsets.UTF_8));
    return "Basic " + token;
  }

  private ResponseStatusException gatewayException(RestClientResponseException exception) {
    var message = gatewayMessage(exception);

    if (message.contains("requested URL was not found")) {
      message = "Razorpay UPI QR API is not enabled for this account. Enable QR Codes API in Razorpay support/dashboard, or use a different gateway account.";
    }

    return new ResponseStatusException(HttpStatus.BAD_GATEWAY, message);
  }

  private boolean isQrApiUnavailable(RestClientResponseException exception) {
    var message = gatewayMessage(exception).toLowerCase();
    return message.contains("requested url was not found")
        || message.contains("qr api is not enabled")
        || message.contains("qr codes api");
  }

  private String gatewayMessage(RestClientResponseException exception) {
    var message = "Payment gateway request failed.";

    try {
      var body = objectMapper.readTree(exception.getResponseBodyAsString());
      var description = body.path("error").path("description").asText();
      if (!description.isBlank()) {
        message = description;
      }
    } catch (Exception ignored) {
      if (!exception.getResponseBodyAsString().isBlank()) {
        message = exception.getResponseBodyAsString();
      }
    }

    return message;
  }
}
