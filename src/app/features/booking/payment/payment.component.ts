import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Booking } from '../../../core/models/booking.model';
import { BookingService } from '../../../core/services/booking.service';

declare global {
  interface Window {
    Cashfree?: (options: { mode: 'sandbox' | 'production' }) => CashfreeCheckout;
  }
}

interface CashfreeCheckout {
  checkout(options: {
    paymentSessionId: string;
    redirectTarget: '_self' | '_blank' | '_top' | '_modal';
  }): Promise<unknown>;
}

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss',
  standalone: false
})
export class PaymentComponent implements OnInit {
  booking?: Booking;
  paymentMessage = 'Create a secure Cashfree payment for this booking.';
  errorMessage = '';
  successMessage = '';
  isCreatingOrder = false;
  isVerifyingPayment = false;
  isCheckingStatus = false;
  bookingId = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly bookingService: BookingService
  ) {}

  ngOnInit(): void {
    this.bookingId = Number(this.route.snapshot.paramMap.get('bookingId'));
    this.booking = this.bookingService.getLocalBookingById(this.bookingId);
    this.verifyReturnedCashfreeCheckout();
  }

  get payableAmount(): number {
    const unitPrice = Number(this.booking?.price ?? 0);
    const count = Number(this.booking?.guests ?? this.booking?.passengers ?? 1);
    return unitPrice * Math.max(1, count);
  }

  payWithCashfree(): void {
    if (!this.bookingId || this.isCreatingOrder || this.isVerifyingPayment) {
      return;
    }

    this.isCreatingOrder = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.paymentMessage = 'Creating your Cashfree checkout...';
    this.bookingService.createPaymentOrder(this.bookingId).subscribe({
      next: (order) => {
        this.isCreatingOrder = false;
        this.openCheckout(order);
      },
      error: (error) => {
        this.isCreatingOrder = false;
        this.paymentMessage = 'Create a secure Cashfree payment for this booking.';
        this.errorMessage = this.readErrorMessage(error, 'Unable to create Cashfree payment. Check backend Cashfree credentials.');
      }
    });
  }

  private verifyReturnedCashfreeCheckout(): void {
    const query = this.route.snapshot.queryParamMap;
    const orderId = query.get('cashfree_order_id') || query.get('order_id');

    if (!orderId || !this.bookingId) {
      return;
    }

    this.isVerifyingPayment = true;
    this.paymentMessage = 'Verifying Cashfree payment...';
    this.errorMessage = '';
    this.successMessage = '';

    this.verifyCashfreePayment(orderId);
  }

  checkPaymentStatus(): void {
    if (!this.bookingId || this.isCheckingStatus) {
      return;
    }

    this.isCheckingStatus = true;
    this.errorMessage = '';
    this.bookingService.getPaymentStatus(this.bookingId).subscribe({
      next: (payment) => {
        this.isCheckingStatus = false;
        this.paymentMessage = payment.message;
        this.successMessage = payment.status === 'SUCCESS' ? payment.message : '';
        if (this.booking) {
          this.booking = {
            ...this.booking,
            paymentStatus: payment.status,
            paymentId: payment.paymentId,
            status: payment.status === 'SUCCESS' ? 'CONFIRMED' : payment.status === 'FAILED' ? 'CANCELLED' : 'PENDING'
          };
        }
      },
      error: (error) => {
        this.isCheckingStatus = false;
        this.errorMessage = this.readErrorMessage(error, 'Unable to check payment status.');
      }
    });
  }

  private openCheckout(order: {
    orderId: string;
    paymentSessionId: string;
    cashfreeMode: 'sandbox' | 'production';
  }): void {
    this.loadCashfreeCheckout().then(() => {
      if (!window.Cashfree) {
        this.errorMessage = 'Cashfree Checkout could not be loaded.';
        return;
      }

      const cashfree = window.Cashfree({ mode: order.cashfreeMode || 'sandbox' });
      cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: '_modal'
      }).then(() => {
        this.verifyCashfreePayment(order.orderId);
      }).catch(() => {
        this.paymentMessage = 'Payment was closed before completion.';
      });
    }).catch(() => {
      this.errorMessage = 'Cashfree Checkout could not be loaded.';
    });
  }

  private verifyCashfreePayment(orderId: string): void {
    this.isVerifyingPayment = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.bookingService.verifyPayment(this.bookingId, {
      cashfreeOrderId: orderId
    }).subscribe({
      next: (payment) => {
        this.isVerifyingPayment = false;
        this.paymentMessage = payment.message;
        this.successMessage = payment.status === 'SUCCESS' ? payment.message : '';
        if (this.booking) {
          this.booking = {
            ...this.booking,
            status: payment.status === 'SUCCESS' ? 'CONFIRMED' : payment.status === 'FAILED' ? 'CANCELLED' : 'PENDING',
            paymentStatus: payment.status,
            paymentId: payment.paymentId
          };
        }
      },
      error: (error) => {
        this.isVerifyingPayment = false;
        this.errorMessage = this.readErrorMessage(error, 'Payment verification failed.');
      }
    });
  }

  private loadCashfreeCheckout(): Promise<void> {
    if (window.Cashfree) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
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
