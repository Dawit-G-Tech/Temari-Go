import { Request, Response } from 'express';
import axios from 'axios';

const CHAPA_URL = process.env.CHAPA_URL || 'https://api.chapa.co/v1/transaction/initialize';
const CHAPA_AUTH = process.env.CHAPA_AUTH || '';

function makeConfig(): { headers?: Record<string, string> } {
  return CHAPA_AUTH ? { headers: { Authorization: `Bearer ${CHAPA_AUTH}` } } : {};
}

export const initializePayment = async (req: Request, res: Response) => {
  try {
    if (!CHAPA_AUTH) {
      console.error('CHAPA_AUTH is not set');
      return res.status(500).json({ error: 'Missing CHAPA_AUTH environment variable' });
    }

    // Basic validation
    if (!req.body.email) {
      return res.status(400).json({ error: 'email is required' });
    }
    const CALLBACK_URL = process.env.CHAPA_CALLBACK_BASE || 'http://localhost:4000/api/payment/verify/';
    const RETURN_URL = process.env.CHAPA_RETURN_URL || 'http://localhost:3000/payment-success';

    const txRef = `tx-myecommerce-${Date.now()}`;

    const data = {
      amount: req.body.amount || '100',
      currency: req.body.currency || 'ETB',
      email: req.body.email || 'customer@example.com',
      first_name: req.body.first_name || 'First',
      last_name: req.body.last_name || 'Last',
      tx_ref: txRef,
      callback_url: CALLBACK_URL + txRef,
      return_url: RETURN_URL
    };

    const cfg = makeConfig();
    console.log('Chapa request config:', cfg);
    const response = await axios.post(CHAPA_URL, data, cfg);
    return res.json({ checkout_url: response.data.data.checkout_url, tx_ref: txRef });
  } catch (err: any) {
    if (err.response) {
      console.error('initializePayment error response:', err.response.data);
      return res.status(err.response.status || 500).json(err.response.data);
    }
    console.error('initializePayment error', err.message || err);
    return res.status(500).json({ error: 'Failed to initialize payment' });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    if (!CHAPA_AUTH) {
      console.error('CHAPA_AUTH is not set');
      return res.status(500).json({ error: 'Missing CHAPA_AUTH environment variable' });
    }

    const id = req.params.id;
    const url = `https://api.chapa.co/v1/transaction/verify/${id}`;
    const cfg = makeConfig();
    console.log('Chapa verify config:', cfg);
    const response = await axios.get(url, cfg);
    return res.json({ verified: true, data: response.data });
  } catch (err) {
    const e: any = err;
    if (e.response) {
      console.error('verifyPayment error response:', e.response.data);
      return res.status(e.response.status || 500).json(e.response.data);
    }
    console.error('verifyPayment error', e.message || e);
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
};

export const paymentSuccess = async (_req: Request, res: Response) => {
  return res.json({ status: 'success' });
};
