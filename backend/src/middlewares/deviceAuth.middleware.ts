import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../../models';

const { Device } = db;

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  // timingSafeEqual requires equal length buffers
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Device authentication for microcontroller ingestion endpoints.
 *
 * Contract:
 * - Provide header `x-device-key: <raw-api-key>`.
 * - Server hashes it (sha256 hex) and looks up active device by `api_key_hash`.
 *
 * Behavior:
 * - In production: required.
 * - In non-production: can be bypassed by setting `DEVICE_AUTH_REQUIRED=false`.
 */
export default async function deviceAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const required =
    process.env.DEVICE_AUTH_REQUIRED === 'true' || process.env.NODE_ENV === 'production';

  const rawKey =
    (req.header('x-device-key') || req.header('X-Device-Key') || '').toString().trim();

  if (!rawKey) {
    if (!required) return next();
    return res.status(401).json({
      success: false,
      code: 'DEVICE_KEY_REQUIRED',
      message: 'Device key is required (x-device-key header).',
    });
  }

  const hash = sha256Hex(rawKey);

  const device = await Device.findOne({
    where: { active: true, api_key_hash: hash },
  });

  if (!device) {
    if (!required) return next();
    return res.status(401).json({
      success: false,
      code: 'DEVICE_UNAUTHORIZED',
      message: 'Invalid device key.',
    });
  }

  // Optional: bind device/bus to request context for downstream logic
  (req as any).device = {
    id: device.id,
    name: device.name,
    bus_id: device.bus_id ?? null,
  };

  // Guard against accidental hash leakage
  if (!safeEqualHex(hash, device.api_key_hash)) {
    if (!required) return next();
    return res.status(401).json({
      success: false,
      code: 'DEVICE_UNAUTHORIZED',
      message: 'Invalid device key.',
    });
  }

  return next();
}

