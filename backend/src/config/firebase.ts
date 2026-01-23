import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

/**
 * Initialize Firebase Admin SDK
 * 
 * Supports two initialization methods:
 * 1. Service account key file (FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
 * 2. Service account JSON string (FIREBASE_SERVICE_ACCOUNT_KEY) - for cloud deployments
 * 
 * Environment variables:
 * - FIREBASE_SERVICE_ACCOUNT_KEY_PATH: Filename or path to service account JSON file (e.g., "serviceAccountKey.json")
 * - FIREBASE_SERVICE_ACCOUNT_KEY: JSON string or base64-encoded JSON of service account
 * 
 * At least one of the above must be provided.
 */
let firebaseAdmin: admin.app.App | null = null;

function initializeFirebase(): admin.app.App {
	if (firebaseAdmin) {
		return firebaseAdmin;
	}

	try {
		// Method 1: Service account key file path
		const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
		if (serviceAccountPath) {
			// Resolve path relative to backend root
			// If it's just a filename (like "serviceAccountKey.json"), resolve from backend root
			// If it's already an absolute path, use it as-is
			let resolvedPath: string;
			if (path.isAbsolute(serviceAccountPath)) {
				resolvedPath = serviceAccountPath;
			} else {
				// Resolve relative to backend root (go up 2 levels from src/config)
				const backendRoot = path.resolve(__dirname, '../..');
				resolvedPath = path.resolve(backendRoot, serviceAccountPath);
			}
			
			const serviceAccount = require(resolvedPath);
			firebaseAdmin = admin.initializeApp({
				credential: admin.credential.cert(serviceAccount),
			});
			console.log('Firebase Admin SDK initialized using service account file:', resolvedPath);
			return firebaseAdmin;
		}

		// Method 2: Service account JSON string (for cloud deployments)
		const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
		if (serviceAccountKey) {
			let serviceAccount: admin.ServiceAccount;
			
			// Try parsing as JSON string first
			try {
				serviceAccount = JSON.parse(serviceAccountKey);
			} catch {
				// If not JSON, try base64 decode
				try {
					const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
					serviceAccount = JSON.parse(decoded);
				} catch {
					throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY must be valid JSON or base64-encoded JSON');
				}
			}

			firebaseAdmin = admin.initializeApp({
				credential: admin.credential.cert(serviceAccount),
			});
			console.log('Firebase Admin SDK initialized using service account key');
			return firebaseAdmin;
		}

		throw new Error(
			'Firebase Admin SDK initialization failed: Missing FIREBASE_SERVICE_ACCOUNT_KEY_PATH or FIREBASE_SERVICE_ACCOUNT_KEY environment variable'
		);
	} catch (error: any) {
		console.error('Firebase Admin SDK initialization error:', error.message);
		// Don't throw - allow app to start without FCM if not configured
		// This is useful for development environments
		throw error;
	}
}

/**
 * Get Firebase Admin instance
 * Initializes if not already initialized
 * Returns null if initialization fails (e.g., missing config)
 */
export function getFirebaseAdmin(): admin.app.App | null {
	if (firebaseAdmin) {
		return firebaseAdmin;
	}
	
	try {
		return initializeFirebase();
	} catch (error) {
		console.warn('Firebase Admin SDK not available:', error instanceof Error ? error.message : 'Unknown error');
		return null;
	}
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
	if (firebaseAdmin) {
		return true;
	}
	
	// Try to initialize, but don't throw if it fails
	try {
		const app = initializeFirebase();
		return app !== null;
	} catch {
		return false;
	}
}

/**
 * Get Firebase Messaging instance
 * @throws Error if Firebase is not initialized
 */
export function getMessaging(): admin.messaging.Messaging {
	const app = getFirebaseAdmin();
	if (!app) {
		throw new Error('Firebase Admin SDK is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT_KEY_PATH or FIREBASE_SERVICE_ACCOUNT_KEY.');
	}
	return admin.messaging(app);
}

export default getFirebaseAdmin;
