import { db } from '../../models';
import { Op } from 'sequelize';
const { Payment, Student, User } = db;

export interface PaymentInput {
	parent_id: number;
	student_id: number;
	amount: number;
	chapa_transaction_id?: string;
	payment_method?: string;
	status?: 'pending' | 'completed' | 'failed';
}

export interface PaymentFilters {
	startDate?: Date;
	endDate?: Date;
	status?: 'pending' | 'completed' | 'failed';
	limit?: number;
	offset?: number;
}

export class PaymentService {
	/**
	 * Create a new payment record
	 */
	static async createPayment(input: PaymentInput) {
		// Validate that student belongs to parent
		const student = await Student.findOne({
			where: {
				id: input.student_id,
				parent_id: input.parent_id,
			},
		});

		if (!student) {
			throw new Error('Student not found or does not belong to the specified parent');
		}

		// Check if payment with this transaction ID already exists
		if (input.chapa_transaction_id) {
			const existingPayment = await Payment.findOne({
				where: { chapa_transaction_id: input.chapa_transaction_id },
			});

			if (existingPayment) {
				throw new Error('Payment with this transaction ID already exists');
			}
		}

		const payment = await Payment.create({
			parent_id: input.parent_id,
			student_id: input.student_id,
			amount: input.amount,
			chapa_transaction_id: input.chapa_transaction_id,
			payment_method: input.payment_method,
			status: input.status || 'pending',
			timestamp: new Date(),
		});

		return payment;
	}

	/**
	 * Update payment status
	 */
	static async updatePaymentStatus(
		paymentId: number,
		status: 'pending' | 'completed' | 'failed',
		chapaTransactionId?: string,
		paymentMethod?: string
	) {
		const payment = await Payment.findByPk(paymentId);

		if (!payment) {
			throw new Error('Payment not found');
		}

		const updateData: any = {
			status,
		};

		if (chapaTransactionId) {
			updateData.chapa_transaction_id = chapaTransactionId;
		}

		if (paymentMethod) {
			updateData.payment_method = paymentMethod;
		}

		await payment.update(updateData);

		return payment;
	}

	/**
	 * Update payment by Chapa transaction ID
	 */
	static async updatePaymentByTransactionId(
		chapaTransactionId: string,
		status: 'pending' | 'completed' | 'failed',
		paymentMethod?: string
	) {
		const payment = await Payment.findOne({
			where: { chapa_transaction_id: chapaTransactionId },
		});

		if (!payment) {
			throw new Error('Payment not found with the given transaction ID');
		}

		const updateData: any = {
			status,
		};

		if (paymentMethod) {
			updateData.payment_method = paymentMethod;
		}

		await payment.update(updateData);

		return payment;
	}

	/**
	 * Find payment by Chapa transaction reference (tx_ref)
	 * Chapa uses tx_ref during initialization, then returns transaction_id in callback
	 */
	static async findPaymentByTxRef(txRef: string) {
		// Find by chapa_transaction_id (which stores the tx_ref initially)
		const payment = await Payment.findOne({
			where: { chapa_transaction_id: txRef },
		});

		return payment;
	}

	/**
	 * Get payment history for a parent
	 */
	static async getParentPayments(parentId: number, filters?: PaymentFilters) {
		const where: any = {
			parent_id: parentId,
		};

		// Filter by status
		if (filters?.status) {
			where.status = filters.status;
		}

		// Filter by date range
		if (filters?.startDate || filters?.endDate) {
			where.timestamp = {};
			if (filters.startDate) {
				where.timestamp[Op.gte] = filters.startDate;
			}
			if (filters.endDate) {
				where.timestamp[Op.lte] = filters.endDate;
			}
		}

		const limit = filters?.limit || 50;
		const offset = filters?.offset || 0;

		const payments = await Payment.findAndCountAll({
			where,
			include: [
				{
					model: Student,
					attributes: ['id', 'full_name', 'grade'],
				},
			],
			order: [['timestamp', 'DESC']],
			limit,
			offset,
		});

		return {
			payments: payments.rows,
			total: payments.count,
			limit,
			offset,
		};
	}

	/**
	 * Get payment history for a student
	 */
	static async getStudentPayments(studentId: number, filters?: PaymentFilters) {
		const where: any = {
			student_id: studentId,
		};

		// Filter by status
		if (filters?.status) {
			where.status = filters.status;
		}

		// Filter by date range
		if (filters?.startDate || filters?.endDate) {
			where.timestamp = {};
			if (filters.startDate) {
				where.timestamp[Op.gte] = filters.startDate;
			}
			if (filters.endDate) {
				where.timestamp[Op.lte] = filters.endDate;
			}
		}

		const limit = filters?.limit || 50;
		const offset = filters?.offset || 0;

		const payments = await Payment.findAndCountAll({
			where,
			include: [
				{
					model: User,
					as: 'parent',
					attributes: ['id', 'name', 'email'],
				},
			],
			order: [['timestamp', 'DESC']],
			limit,
			offset,
		});

		return {
			payments: payments.rows,
			total: payments.count,
			limit,
			offset,
		};
	}

	/**
	 * Get payment by ID
	 */
	static async getPaymentById(paymentId: number) {
		const payment = await Payment.findByPk(paymentId, {
			include: [
				{
					model: Student,
					attributes: ['id', 'full_name', 'grade'],
				},
				{
					model: User,
					as: 'parent',
					attributes: ['id', 'name', 'email'],
				},
			],
		});

		return payment;
	}
}
