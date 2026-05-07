import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Booking } from '../../../core/models/booking.model';
import { BookingService } from '../../../core/services/booking.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss',
  standalone: false
})
export class PaymentComponent implements OnInit {
  booking?: Booking;
  paymentQrImageUrl = '';
  paymentMessage = 'Creating fixed-amount Razorpay UPI QR...';
  errorMessage = '';
  isCreatingQr = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly bookingService: BookingService
  ) {}

  ngOnInit(): void {
    const bookingId = Number(this.route.snapshot.paramMap.get('bookingId'));
    this.booking = this.bookingService.getLocalBookingById(bookingId);
    this.createRazorpayQr(bookingId);
  }

  get payableAmount(): number {
    const unitPrice = Number(this.booking?.price ?? 0);
    const count = Number(this.booking?.guests ?? this.booking?.passengers ?? 1);
    return unitPrice * Math.max(1, count);
  }

  private createRazorpayQr(bookingId: number): void {
    if (!bookingId) {
      return;
    }

    this.isCreatingQr = true;
    this.bookingService.createPaymentQr(bookingId).subscribe({
      next: (payment) => {
        this.isCreatingQr = false;
        this.paymentQrImageUrl = payment.imageUrl;
        this.paymentMessage = payment.message;
        this.errorMessage = '';
      },
      error: (error) => {
        this.isCreatingQr = false;
        this.paymentQrImageUrl = '';
        this.paymentMessage = 'Unable to create Razorpay QR';
        this.errorMessage = this.readErrorMessage(error, 'Razorpay QR Codes API could not create a fixed-amount QR for this account.');
      }
    });
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const response = (error as { error?: { detail?: string; message?: string; error?: string } }).error;
      return response?.detail || response?.message || response?.error || fallback;
    }

    return fallback;
  }
}
