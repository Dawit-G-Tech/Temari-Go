import { db } from '../../models';
import { Op } from 'sequelize';
import { NotificationService } from './notification.service';

const { Invoice, Student, User, Payment } = db;

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceBulkItem {
	parent_id: number;
	student_id: number;
	amount: number;
	due_date: string; // YYYY-MM-DD
	period_label: string;
}

export interface InvoiceFilters {
	status?: InvoiceStatus;
	parentId?: number;
	studentId?: number;
	dueFrom?: string;
	dueTo?: string;
	limit?: number;
	offset?: number;
}

// Throttle: run markOverdue at most once per 5 minutes (per process).
// Without this, every "list invoices" request would run an UPDATE on the DB to set
// pending invoices with due_date < today to "overdue". That would mean a write on every
// read (e.g. every time an admin or parent opens the invoice list). Throttling limits
// that to once per 5 min so lists stay fast and we avoid unnecessary DB writes.
const MARK_OVERDUE_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
let lastMarkOverdueAt = 0;

export class InvoiceService {
	/**
	 * Create multiple invoices in one go (admin bulk send).
	 * Batch-validates students and uses bulkCreate for minimal DB round-trips.
	 * Skips duplicates (same parent_id, student_id, period_label) when skipDuplicates is true.
	 */
	static async createBulk(
		items: InvoiceBulkItem[],
		options: { notifyParent?: boolean; skipDuplicates?: boolean } = {}
	): Promise<{ created: number; errors: string[] }> {
		const errors: string[] = [];
		const today = new Date().toISOString().slice(0, 10);

		if (items.length === 0) {
			return { created: 0, errors: [] };
		}

		// Batch-fetch all (parent_id, student_id) pairs to validate in one query
		const pairs = [...new Set(items.map((i) => `${i.parent_id}:${i.student_id}`))];
		const [parentIds, studentIds] = pairs.reduce(
			([p, s], key) => {
				const [pid, sid] = key.split(':').map(Number);
				p.add(pid);
				s.add(sid);
				return [p, s];
			},
			[new Set<number>(), new Set<number>()]
		);

		const validStudents = await Student.findAll({
			where: {
				id: { [Op.in]: [...studentIds] },
				parent_id: { [Op.in]: [...parentIds] },
			},
			attributes: ['id', 'parent_id'],
		});
		const validSet = new Set(
			validStudents.map((s) => `${s.parent_id}:${s.id}`)
		);

		// Optionally exclude duplicates (same parent, student, period_label)
		let toCreate = items.filter((item) => {
			if (!validSet.has(`${item.parent_id}:${item.student_id}`)) {
				errors.push(
					`Student ${item.student_id} not found or does not belong to parent ${item.parent_id}`
				);
				return false;
			}
			return true;
		});

		if (options.skipDuplicates && toCreate.length > 0) {
			const existing = await Invoice.findAll({
				where: {
					[Op.or]: toCreate.map((i) => ({
						parent_id: i.parent_id,
						student_id: i.student_id,
						period_label: i.period_label,
					})),
				},
				attributes: ['parent_id', 'student_id', 'period_label'],
			});
			const existingSet = new Set(
				existing.map((e) => `${e.parent_id}:${e.student_id}:${e.period_label}`)
			);
			const before = toCreate.length;
			toCreate = toCreate.filter(
				(i) => !existingSet.has(`${i.parent_id}:${i.student_id}:${i.period_label}`)
			);
			if (before > toCreate.length) {
				errors.push(
					`${before - toCreate.length} duplicate invoice(s) skipped (same period for student).`
				);
			}
		}

		if (toCreate.length === 0) {
			return { created: 0, errors };
		}

		const rows = toCreate.map((item) => ({
			parent_id: item.parent_id,
			student_id: item.student_id,
			amount: item.amount,
			due_date: item.due_date,
			period_label: item.period_label.slice(0, 100),
			status: (item.due_date < today ? 'overdue' : 'pending') as InvoiceStatus,
		}));

		await Invoice.bulkCreate(rows);
		const created = rows.length;

		if (options.notifyParent && created > 0) {
			const notifiedParents = new Set<number>();
			for (const item of toCreate) {
				if (notifiedParents.has(item.parent_id)) continue;
				notifiedParents.add(item.parent_id);
				const count = toCreate.filter((i) => i.parent_id === item.parent_id).length;
				try {
					await NotificationService.sendFCMNotification(
						item.parent_id,
						'invoice_created',
						`You have ${count} new invoice(s). Check due dates and pay in the app.`
					);
				} catch (e) {
					console.warn('Failed to send invoice notification to parent', item.parent_id, e);
				}
			}
		}

		return { created, errors };
	}

	/**
	 * Get invoices for a parent (their own only).
	 */
	static async getForParent(
		parentId: number,
		filters?: InvoiceFilters
	): Promise<{ invoices: InstanceType<typeof Invoice>[]; total: number; limit: number; offset: number }> {
		const where: any = { parent_id: parentId };
		if (filters?.status) where.status = filters.status;
		if (filters?.studentId) where.student_id = filters.studentId;
		if (filters?.dueFrom || filters?.dueTo) {
			where.due_date = {};
			if (filters.dueFrom) where.due_date[Op.gte] = filters.dueFrom;
			if (filters.dueTo) where.due_date[Op.lte] = filters.dueTo;
		}
		const limit = filters?.limit ?? 50;
		const offset = filters?.offset ?? 0;

		const { rows, count } = await Invoice.findAndCountAll({
			where,
			include: [
				{ model: Student, attributes: ['id', 'full_name', 'grade'] },
			],
			order: [['due_date', 'DESC'], ['id', 'DESC']],
			limit,
			offset,
		});
		return { invoices: rows, total: count, limit, offset };
	}

	/**
	 * Get all invoices (admin) with optional filters.
	 */
	static async getAll(
		filters?: InvoiceFilters
	): Promise<{ invoices: InstanceType<typeof Invoice>[]; total: number; limit: number; offset: number }> {
		const where: any = {};
		if (filters?.status) where.status = filters.status;
		if (filters?.parentId) where.parent_id = filters.parentId;
		if (filters?.studentId) where.student_id = filters.studentId;
		if (filters?.dueFrom || filters?.dueTo) {
			where.due_date = {};
			if (filters.dueFrom) where.due_date[Op.gte] = filters.dueFrom;
			if (filters.dueTo) where.due_date[Op.lte] = filters.dueTo;
		}
		const limit = filters?.limit ?? 100;
		const offset = filters?.offset ?? 0;

		const { rows, count } = await Invoice.findAndCountAll({
			where,
			include: [
				{ model: Student, attributes: ['id', 'full_name', 'grade'] },
				{ model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
			],
			order: [['due_date', 'DESC'], ['id', 'DESC']],
			limit,
			offset,
		});
		return { invoices: rows, total: count, limit, offset };
	}

	/**
	 * When a payment is completed, link it to the oldest pending/overdue invoice
	 * for that parent+student and mark the invoice as paid.
	 */
	static async linkPaymentToInvoice(
		paymentId: number,
		options?: { transaction?: any }
	): Promise<InstanceType<typeof Invoice> | null> {
		const tx = options?.transaction;
		const payment = await Payment.findByPk(paymentId, tx ? { transaction: tx } : undefined);
		if (!payment || payment.status !== 'completed') return null;

		const invoice = await Invoice.findOne({
			transaction: tx,
			lock: tx ? tx.LOCK.UPDATE : undefined,
			where: {
				parent_id: payment.parent_id,
				student_id: payment.student_id,
				status: { [Op.in]: ['pending', 'overdue'] },
			},
			order: [['due_date', 'ASC'], ['id', 'ASC']],
		});
		if (!invoice) return null;

		await invoice.update({
			status: 'paid',
			payment_id: paymentId,
		}, tx ? { transaction: tx } : undefined);
		return invoice;
	}

	/**
	 * Mark pending invoices with due_date < today as overdue.
	 * Throttled to run at most once per MARK_OVERDUE_THROTTLE_MS to avoid writes on every list.
	 */
	static async markOverdue(): Promise<number> {
		const now = Date.now();
		if (now - lastMarkOverdueAt < MARK_OVERDUE_THROTTLE_MS) {
			return 0;
		}
		lastMarkOverdueAt = now;
		const today = new Date().toISOString().slice(0, 10);
		const [count] = await Invoice.update(
			{ status: 'overdue' },
			{
				where: {
					status: 'pending',
					due_date: { [Op.lt]: today },
				},
			}
		);
		return count ?? 0;
	}
}
