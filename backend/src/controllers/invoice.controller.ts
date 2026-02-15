import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoice.service';

/**
 * Create bulk invoices (admin only)
 * POST /api/invoices/bulk
 * Body: { items: [{ parent_id, student_id, amount, due_date, period_label }], notifyParent?: boolean }
 */
export const createBulk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Only admins can create bulk invoices',
      });
    }

    const { items, notifyParent, skipDuplicates } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'items must be a non-empty array',
      });
    }

    const validated = items.map((i: any) => ({
      parent_id: parseInt(i.parent_id, 10),
      student_id: parseInt(i.student_id, 10),
      amount: parseFloat(i.amount),
      due_date: String(i.due_date || '').slice(0, 10),
      period_label: String(i.period_label || '').trim(),
    }));

    const invalid = validated.filter(
      (v) =>
        Number.isNaN(v.parent_id) ||
        Number.isNaN(v.student_id) ||
        Number.isNaN(v.amount) ||
        !v.due_date ||
        !v.period_label
    );
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ITEMS',
        message: 'Each item must have parent_id, student_id, amount, due_date (YYYY-MM-DD), and period_label',
      });
    }

    const result = await InvoiceService.createBulk(validated, {
      notifyParent: !!notifyParent,
      skipDuplicates: !!skipDuplicates,
    });

    return res.status(201).json({
      success: true,
      data: {
        created: result.created,
        errors: result.errors,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get invoices for the current user (parent: own only; admin: all with filters)
 * GET /api/invoices
 * Query: status, parentId, studentId, dueFrom, dueTo, limit, offset
 */
export const listInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    await InvoiceService.markOverdue();

    const filters: any = {};
    if (req.query.status) {
      const s = req.query.status as string;
      if (['pending', 'paid', 'overdue', 'cancelled'].includes(s)) {
        filters.status = s;
      }
    }
    if (req.query.dueFrom) filters.dueFrom = String(req.query.dueFrom).slice(0, 10);
    if (req.query.dueTo) filters.dueTo = String(req.query.dueTo).slice(0, 10);
    if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);
    if (req.query.offset) filters.offset = parseInt(req.query.offset as string, 10);

    if (req.user.role === 'admin') {
      if (req.query.parentId) filters.parentId = parseInt(req.query.parentId as string, 10);
      if (req.query.studentId) filters.studentId = parseInt(req.query.studentId as string, 10);
      const result = await InvoiceService.getAll(filters);
      return res.json({
        success: true,
        data: result.invoices,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      });
    }

    if (req.user.role === 'parent') {
      if (req.query.studentId) filters.studentId = parseInt(req.query.studentId as string, 10);
      const result = await InvoiceService.getForParent(Number(req.user.id), filters);
      return res.json({
        success: true,
        data: result.invoices,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      });
    }

    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Access denied',
    });
  } catch (err) {
    return next(err);
  }
};
