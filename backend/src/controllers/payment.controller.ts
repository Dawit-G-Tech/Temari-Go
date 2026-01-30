import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { PaymentService } from '../services/payment.service';

const CHAPA_URL = process.env.CHAPA_URL || 'https://api.chapa.co/v1/transaction/initialize';
const CHAPA_AUTH = process.env.CHAPA_AUTH || '';
const CHAPA_WEBHOOK_SECRET = process.env.CHAPA_WEBHOOK_SECRET || '';

function makeConfig(): { headers?: Record<string, string> } {
  return CHAPA_AUTH ? { headers: { Authorization: `Bearer ${CHAPA_AUTH}` } } : {};
}

/**
 * Initialize payment with Chapa
 * POST /api/payment/pay
 * Body: { parent_id, student_id, amount, email, first_name, last_name, currency? }
 */
export const initializePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!CHAPA_AUTH) {
      console.error('CHAPA_AUTH is not set');
      return res.status(500).json({ error: 'Missing CHAPA_AUTH environment variable' });
    }

    // Validation
    const { parent_id, student_id, amount, email, first_name, last_name, currency } = req.body;

    if (!parent_id || !student_id || !amount || !email) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'parent_id, student_id, amount, and email are required',
      });
    }

    const RETURN_URL = process.env.CHAPA_RETURN_URL || 'http://localhost:3000/payment-success';

    // Generate unique transaction reference
    const txRef = `tx-temari-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create payment record in database with pending status
    const payment = await PaymentService.createPayment({
      parent_id: parseInt(parent_id, 10),
      student_id: parseInt(student_id, 10),
      amount: parseFloat(amount),
      chapa_transaction_id: txRef, // Store tx_ref initially, will be updated with actual transaction_id from webhook
      status: 'pending',
    });

    // Initialize payment with Chapa
    const data = {
      amount: amount.toString(),
      currency: currency || 'ETB',
      email: email,
      first_name: first_name || 'First',
      last_name: last_name || 'Last',
      tx_ref: txRef,
      return_url: RETURN_URL,
    };

    const cfg = makeConfig();
    const response = await axios.post(CHAPA_URL, data, cfg);

    return res.json({
      success: true,
      data: {
        checkout_url: response.data.data.checkout_url,
        tx_ref: txRef,
        payment_id: payment.id,
      },
    });
  } catch (err: any) {
    if (err.message === 'Student not found or does not belong to the specified parent') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STUDENT',
        message: err.message,
      });
    }
    if (err.response) {
      console.error('initializePayment error response:', err.response.data);
      return res.status(err.response.status || 500).json({
        success: false,
        code: 'CHAPA_ERROR',
        message: 'Failed to initialize payment with Chapa',
        error: err.response.data,
      });
    }
    console.error('initializePayment error', err.message || err);
    return next(err);
  }
};

/**
 * Verify Chapa webhook signature
 */
function verifyChapaSignature(req: Request, secret: string): boolean {
  if (!secret) {
    console.warn('CHAPA_WEBHOOK_SECRET not set, skipping signature verification');
    return true; // Allow if secret not configured (for development)
  }

  const chapaSignature = req.headers['chapa-signature'] as string;
  const xChapaSignature = req.headers['x-chapa-signature'] as string;

  if (!chapaSignature && !xChapaSignature) {
    console.warn('No Chapa signature headers found');
    return false;
  }

  // Create HMAC SHA256 hash of the request body
  const payload = JSON.stringify(req.body);
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Verify against either header (Chapa may send either)
  const isValid =
    (chapaSignature !== undefined && hash === chapaSignature) ||
    (xChapaSignature !== undefined && hash === xChapaSignature);

  if (!isValid) {
    console.error('Invalid Chapa webhook signature');
  }

  return isValid;
}

/**
 * Chapa webhook handler
 * POST /api/payment/webhook
 * This endpoint is called by Chapa when payment events occur
 * Configure this URL in your Chapa dashboard: Settings > Webhooks
 */
export const paymentWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify webhook signature (if secret is configured)
    if (!verifyChapaSignature(req, CHAPA_WEBHOOK_SECRET)) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_SIGNATURE',
        message: 'Invalid webhook signature',
      });
    }

    const event = req.body;

    // Only process transaction events (ignore payout events)
    if (event.type && event.type === 'Payout') {
      console.log('Ignoring payout event:', event.event);
      return res.status(200).json({ received: true });
    }

    // Extract transaction data from webhook payload
    const txRef = event.tx_ref;
    const status = event.status;
    const eventType = event.event; 
    const chapaReference = event.reference; // Chapa's internal transaction ID 
    const paymentMethod = event.payment_method;

    if (!txRef) {
      console.error('Webhook missing tx_ref:', event);
      return res.status(400).json({
        success: false,
        code: 'MISSING_TX_REF',
        message: 'Transaction reference (tx_ref) is required',
      });
    }

    // Find payment by tx_ref (which we stored as chapa_transaction_id during initialization)
    const payment = await PaymentService.findPaymentByTxRef(txRef);

    if (!payment) {
      console.error(`Payment not found for tx_ref: ${txRef}`);
      // Return 200 to acknowledge receipt (idempotent - don't retry)
      return res.status(200).json({
        received: true,
        message: 'Payment not found for the given transaction reference',
      });
    }

    // Check if already processed (idempotency check)
    // If payment is already completed/failed and webhook says the same, just acknowledge
    if (
      (payment.status === 'completed' && status === 'success') ||
      (payment.status === 'failed' && (status === 'failed' || status === 'cancelled'))
    ) {
      console.log(`Payment ${payment.id} already processed with status ${payment.status}, acknowledging webhook`);
      return res.status(200).json({
        received: true,
        message: 'Payment already processed',
        payment_id: payment.id,
        status: payment.status,
      });
    }

    // Determine payment status from webhook
    let paymentStatus: 'pending' | 'completed' | 'failed' = 'pending';
    if (status === 'success' || eventType === 'charge.success') {
      paymentStatus = 'completed';
    } else if (status === 'failed' || status === 'cancelled' || eventType === 'charge.failed') {
      paymentStatus = 'failed';
    }

    // Best Practice: Verify transaction with Chapa API before updating
    // This ensures the webhook data matches what Chapa has on record
    if (!CHAPA_AUTH) {
      console.warn('CHAPA_AUTH not set, skipping API verification');
    } else {
      try {
        const verifyUrl = `https://api.chapa.co/v1/transaction/verify/${txRef}`;
        const cfg = makeConfig();
        const verifyResponse = await axios.get(verifyUrl, cfg);
        const verifiedData = verifyResponse.data?.data;

        // Verify critical fields match
        if (verifiedData) {
          const verifiedStatus = verifiedData.status;
          const verifiedAmount = parseFloat(verifiedData.amount || 0);
          const verifiedTxRef = verifiedData.tx_ref;

          // Check if status matches
          if (verifiedStatus !== status) {
            console.warn(
              `Status mismatch: webhook says ${status}, API says ${verifiedStatus}. Using API status.`
            );
            if (verifiedStatus === 'success') {
              paymentStatus = 'completed';
            } else if (verifiedStatus === 'failed' || verifiedStatus === 'cancelled') {
              paymentStatus = 'failed';
            }
          }

          // Verify amount matches (critical security check)
          if (Math.abs(verifiedAmount - parseFloat(payment.amount.toString())) > 0.01) {
            console.error(
              `Amount mismatch for payment ${payment.id}: webhook amount doesn't match stored amount`
            );
            // Don't update if amounts don't match - potential fraud
            return res.status(200).json({
              received: true,
              message: 'Amount verification failed, payment not updated',
            });
          }

          // Verify tx_ref matches
          if (verifiedTxRef !== txRef) {
            console.error(`tx_ref mismatch for payment ${payment.id}`);
            return res.status(200).json({
              received: true,
              message: 'Transaction reference mismatch',
            });
          }
        }
      } catch (verifyErr: any) {
        console.error('Error verifying transaction with Chapa API:', verifyErr.message);
        // Continue processing webhook even if verification fails (network issues, etc.)
        // But log it for investigation
      }
    }

    // Update payment status
    // IMPORTANT: Keep tx_ref in chapa_transaction_id (don't overwrite with Chapa's reference)
    await PaymentService.updatePaymentStatus(
      payment.id,
      paymentStatus,
      undefined, // Don't update chapa_transaction_id - preserve the original tx_ref
      paymentMethod
    );

    // Log Chapa's reference if different (for debugging/reference)
    if (chapaReference && chapaReference !== txRef) {
      console.log(
        `Payment ${payment.id}: tx_ref="${txRef}", Chapa reference="${chapaReference}"`
      );
    }

    // Reload payment to get updated data
    const updatedPayment = await PaymentService.getPaymentById(payment.id);

    console.log(`Payment ${payment.id} updated via webhook: ${paymentStatus}`);

    // Return 200 OK to acknowledge receipt (required by Chapa)
    res.status(200).json({
      received: true,
      message: 'Webhook processed successfully',
      payment_id: updatedPayment?.id,
      status: updatedPayment?.status,
    });
  } catch (err: any) {
    console.error('Payment webhook error:', err);
    // Always return 200 to prevent Chapa from retrying
    // Log error for investigation but don't fail the webhook
    res.status(200).json({
      received: true,
      error: 'Error processing webhook',
    });
  }
};


/**
 * Manual payment verification (for testing/admin use)
 * GET /api/payment/verify/:id
 */
export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!CHAPA_AUTH) {
      console.error('CHAPA_AUTH is not set');
      return res.status(500).json({
        success: false,
        code: 'MISSING_CONFIG',
        message: 'Missing CHAPA_AUTH environment variable',
      });
    }

    const id = req.params.id;
    const url = `https://api.chapa.co/v1/transaction/verify/${id}`;
    const cfg = makeConfig();
    const response = await axios.get(url, cfg);

    // Try to update payment if it exists
    try {
      const paymentData = response.data.data;
      const status = paymentData.status;
      let paymentStatus: 'pending' | 'completed' | 'failed' = 'pending';
      if (status === 'success' || status === 'successful' || status === 'completed') {
        paymentStatus = 'completed';
      } else if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
        paymentStatus = 'failed';
      }

      await PaymentService.updatePaymentByTransactionId(
        id,
        paymentStatus,
        paymentData.payment_method
      );
    } catch (updateErr) {
      // Payment might not exist yet, that's okay for manual verification
      console.log('Payment not found in database, verification only');
    }

    return res.json({
      success: true,
      verified: true,
      data: response.data,
    });
  } catch (err: any) {
    if (err.response) {
      console.error('verifyPayment error response:', err.response.data);
      return res.status(err.response.status || 500).json({
        success: false,
        code: 'VERIFICATION_FAILED',
        message: 'Failed to verify payment',
        error: err.response.data,
      });
    }
    console.error('verifyPayment error', err.message || err);
    return next(err);
  }
};

/**
 * Payment success page handler
 * GET /api/payment/success
 */
export const paymentSuccess = async (_req: Request, res: Response) => {
  return res.json({ status: 'success', message: 'Payment completed successfully' });
};

/**
 * Get payment history for a parent
 * GET /api/payments/parent/:parentId
 * Query params: status, startDate, endDate, limit, offset
 */
export const getParentPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parentId = parseInt(req.params.parentId, 10);

    if (isNaN(parentId)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PARENT_ID',
        message: 'Invalid parent ID',
      });
    }

    // Check authorization - users can only view their own payments unless admin
    if (req.user && req.user.role !== 'admin' && Number(req.user.id) !== parentId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You can only view your own payment history',
      });
    }

    const filters: any = {};

    if (req.query.status) {
      const status = req.query.status as string;
      if (['pending', 'completed', 'failed'].includes(status)) {
        filters.status = status;
      }
    }

    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }

    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string, 10);
    }

    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string, 10);
    }

    const result = await PaymentService.getParentPayments(parentId, filters);

    return res.json({
      success: true,
      data: result.payments,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get payment history for a student
 * GET /api/payments/student/:studentId
 * Query params: status, startDate, endDate, limit, offset
 */
export const getStudentPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);

    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STUDENT_ID',
        message: 'Invalid student ID',
      });
    }

    // Check authorization - users can only view payments for their own students unless admin
    if (req.user && req.user.role !== 'admin') {
      const { db } = await import('../../models');
      const { Student } = db;
      const student = await Student.findByPk(studentId);
      if (!student || student.parent_id !== Number(req.user.id)) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'You can only view payment history for your own students',
        });
      }
    }

    const filters: any = {};

    if (req.query.status) {
      const status = req.query.status as string;
      if (['pending', 'completed', 'failed'].includes(status)) {
        filters.status = status;
      }
    }

    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }

    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string, 10);
    }

    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string, 10);
    }

    const result = await PaymentService.getStudentPayments(studentId, filters);

    return res.json({
      success: true,
      data: result.payments,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update payment status manually (Admin only)
 * PUT /api/payments/:id/status
 * Body: { status: 'pending' | 'completed' | 'failed' }
 */
export const updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Only admins can manually update payment status',
      });
    }

    const paymentId = parseInt(req.params.id, 10);

    if (isNaN(paymentId)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PAYMENT_ID',
        message: 'Invalid payment ID',
      });
    }

    const { status } = req.body;

    if (!status || !['pending', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        message: 'Status must be one of: pending, completed, failed',
      });
    }

    const payment = await PaymentService.updatePaymentStatus(paymentId, status);

    return res.json({
      success: true,
      data: payment,
      message: 'Payment status updated successfully',
    });
  } catch (err: any) {
    if (err.message === 'Payment not found') {
      return res.status(404).json({
        success: false,
        code: 'PAYMENT_NOT_FOUND',
        message: err.message,
      });
    }
    return next(err);
  }
};
