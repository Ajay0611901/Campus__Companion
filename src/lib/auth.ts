import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';

export async function verifyAuth(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('⚠️ No authorization header found');
        return null;
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        // Special case for local development if Firebase Admin is not fully set up
        if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH_DEV === 'true') {
            return { uid: 'dev-user', email: 'dev@example.com' };
        }

        const decodedToken = await adminAuth.verifyIdToken(token);
        return decodedToken;
    } catch (error: any) {
        console.error('❌ Auth verification failed:', error.message);
        return null;
    }
}
