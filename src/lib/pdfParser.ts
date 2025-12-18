/**
 * PDF Parser Utility (Client-Only)
 * 
 * Extracts text content from PDF files using pdf.js
 * This module is designed for client-side use only.
 */

/**
 * Dynamically load PDF.js and extract text from a file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
    // Dynamically import pdf.js only on client side
    const pdfjsLib = await import('pdfjs-dist');

    // Configure the worker using CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);

                // Load the PDF document
                const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

                let fullText = '';

                // Extract text from each page
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();

                    // Combine text items
                    const pageText = textContent.items
                        .map((item) => {
                            if ('str' in item) {
                                return item.str;
                            }
                            return '';
                        })
                        .join(' ');

                    fullText += pageText + '\n\n';
                }

                resolve(fullText.trim());
            } catch (error) {
                reject(new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Check if a file is a valid PDF
 */
export function isValidPDF(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
