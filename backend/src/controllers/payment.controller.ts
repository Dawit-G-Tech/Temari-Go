import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { PaymentService } from '../services/payment.service';

const CHAPA_URL = process.env.CHAPA_URL || 'https://api.chapa.co/v1/transaction/initialize';
const CHAPA_AUTH = process.env.CHAPA_AUTH || '';

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

    const CALLBACK_URL = process.env.CHAPA_CALLBACK_BASE || 'http://localhost:4000/api/payment/callback/';
    const RETURN_URL = process.env.CHAPA_RETURN_URL || 'http://localhost:3000/payment-success';

    // Generate unique transaction reference
    const txRef = `tx-temari-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create payment record in database with pending status
    const payment = await PaymentService.createPayment({
      parent_id: parseInt(parent_id, 10),
      student_id: parseInt(student_id, 10),
      amount: parseFloat(amount),
      chapa_transaction_id: txRef, // Store tx_ref initially, will be updated with actual transaction_id from callback
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
      callback_url: CALLBACK_URL + txRef,
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
 * Chapa webhook callback handler
 * POST /api/payment/callback/:txRef
 * This endpoint is called by Chapa when payment status changes
 */
export const paymentCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const txRef = req.params.txRef;

    if (!txRef) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_TX_REF',
        message: 'Transaction reference is required',
      });
    }

    // Verify payment status with Chapa
    if (!CHAPA_AUTH) {
      console.error('CHAPA_AUTH is not set');
      return res.status(500).json({
        success: false,
        code: 'MISSING_CONFIG',
        message: 'Missing CHAPA_AUTH environment variable',
      });
    }

    const verifyUrl = `https://api.chapa.co/v1/transaction/verify/${txRef}`;
    const cfg = makeConfig();

    let chapaResponse;
    try {
      chapaResponse = await axios.get(verifyUrl, cfg);
    } catch (verifyErr: any) {
      console.error('Chapa verification error:', verifyErr.response?.data || verifyErr.message);
      // Still try to process if we have payment data in request body (webhook)
      if (!req.body || !req.body.status) {
        return res.status(400).json({
          success: false,
          code: 'VERIFICATION_FAILED',
          message: 'Failed to verify payment with Chapa',
        });
      }
    }

    // Extract payment data from Chapa response or webhook body
    const paymentData = chapaResponse?.data?.data || req.body;
    // Chapa returns tx_ref in the response, and may also return a transaction_id
    const chapaTxRef = paymentData.tx_ref || txRef;
    const chapaTransactionId = paymentData.id || paymentData.transaction_id || chapaTxRef;
    const status = paymentData.status || req.body.status;
    const paymentMethod = paymentData.payment_method || req.body.payment_method;

    // Determine payment status
    let paymentStatus: 'pending' | 'completed' | 'failed' = 'pending';
    if (status === 'success' || status === 'successful' || status === 'completed') {
      paymentStatus = 'completed';
    } else if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
      paymentStatus = 'failed';
    }

    // Find payment by tx_ref (which we stored as chapa_transaction_id during initialization)
    const payment = await PaymentService.findPaymentByTxRef(txRef);

    if (!payment) {
      console.error(`Payment not found for tx_ref: ${txRef}`);
      return res.status(200).json({
        success: false,
        message: 'Payment not found for the given transaction reference',
      });
    }

    // Update payment status
    // If Chapa returned a different transaction_id, update it
    const finalTransactionId = chapaTransactionId !== txRef ? chapaTransactionId : payment.chapa_transaction_id;
    
    await PaymentService.updatePaymentStatus(
      payment.id,
      paymentStatus,
      finalTransactionId !== payment.chapa_transaction_id ? finalTransactionId : undefined,
      paymentMethod
    );

    // Reload payment to get updated data
    const updatedPayment = await PaymentService.getPaymentById(payment.id);

    // Return success response to Chapa
    res.status(200).json({
      success: true,
      message: 'Payment callback processed successfully',
      data: {
        payment_id: updatedPayment?.id,
        status: updatedPayment?.status,
        transaction_id: updatedPayment?.chapa_transaction_id,
      },
    });
  } catch (err: any) {
    console.error('Payment callback error:', err);
    // Still return 200 to Chapa to prevent retries if it's a data issue
    if (err.message === 'Payment not found') {
      return res.status(200).json({
        success: false,
        message: 'Payment not found, but callback received',
      });
    }
    return next(err);
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
