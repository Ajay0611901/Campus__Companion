/**
 * Supabase Client Configuration
 * 
 * Handles file storage for resumes, lecture files, and user uploads
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (uses service role key)
export const supabaseAdmin = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
    bucket: 'resumes' | 'lecture-files' | 'user-uploads',
    path: string,
    file: File | Blob,
    userId: string
): Promise<{ url: string; path: string }> {
    const filePath = `${userId}/${path}`;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL (signed URL for private buckets)
    const { data: urlData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(data.path, 3600); // 1 hour expiry

    if (!urlData) {
        throw new Error('Failed to generate signed URL');
    }

    return {
        url: urlData.signedUrl,
        path: data.path,
    };
}

/**
 * Get signed URL for a file
 */
export async function getSignedUrl(
    bucket: 'resumes' | 'lecture-files' | 'user-uploads',
    path: string,
    expiresIn: number = 3600
): Promise<string> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

    if (error || !data) {
        throw new Error('Failed to get signed URL');
    }

    return data.signedUrl;
}

/**
 * Delete file from storage
 */
export async function deleteFile(
    bucket: 'resumes' | 'lecture-files' | 'user-uploads',
    path: string
): Promise<void> {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

    if (error) {
        throw new Error(`Delete failed: ${error.message}`);
    }
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
    return !!(supabaseUrl && supabaseAnonKey);
}
