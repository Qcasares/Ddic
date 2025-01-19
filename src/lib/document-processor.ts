import {
    ProcessedDocument,
    DocumentMetadata,
    ExtractedTerm,
    ProcessingResult,
    ProcessingOptions
} from '../types';
import { TfIdf, WordTokenizer, NGrams } from './nlp';
import './polyfills';
import { createWorker, Worker, createScheduler } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
import mammoth from 'mammoth';

export class DocumentProcessor {
    private static instance: DocumentProcessor;
    private worker: Worker;
    private tfidf: any;
    private wordTokenizer: any;
    private static initializationPromise: Promise<void>;

    private constructor() {
        DocumentProcessor.initializationPromise = this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            // Initialize NLP components using our custom implementation
            this.tfidf = new TfIdf();
            this.wordTokenizer = new WordTokenizer();
            
            await this.initializeWorker();
        } catch (error) {
            console.error('Error initializing DocumentProcessor:', error);
            throw error;
        }
    }

    public static async getInstance(): Promise<DocumentProcessor> {
        if (!DocumentProcessor.instance) {
            DocumentProcessor.instance = new DocumentProcessor();
            await DocumentProcessor.initializationPromise;
        }
        return DocumentProcessor.instance;
    }

    private async initializeWorker(): Promise<void> {
        const scheduler = createScheduler();
        this.worker = await createWorker('eng');
        await scheduler.addWorker(this.worker);
    }

    public async processDocument(
        file: File,
        options: ProcessingOptions
    ): Promise<ProcessingResult> {
        try {
            const processedDoc = await this.preprocess(file);
            const extractedTerms = await this.extractTerms(processedDoc, options);
            
            return {
                documentId: processedDoc.id,
                extractedTerms,
                processingMetrics: {
                    processingTime: Date.now() - new Date(processedDoc.created_at).getTime(),
                    termsFound: extractedTerms.length,
                    confidence: this.calculateAverageConfidence(extractedTerms)
                },
                status: 'completed'
            };
        } catch (error: unknown) {
            console.error('Document processing failed:', error);
            return {
                documentId: '',
                extractedTerms: [],
                processingMetrics: {
                    processingTime: 0,
                    termsFound: 0,
                    confidence: 0
                },
                status: 'failed',
                errors: [error instanceof Error ? error.message : 'Unknown error occurred']
            };
        }
    }

    private async preprocess(file: File): Promise<ProcessedDocument> {
        const content = await this.extractContent(file);
        const metadata = await this.extractMetadata(file);

        return {
            id: crypto.randomUUID(),
            originalName: file.name,
            mimeType: file.type,
            content,
            metadata,
            created_at: new Date().toISOString(),
            processed_at: new Date().toISOString()
        };
    }

    private async extractContent(file: File): Promise<string> {
        const buffer = await file.arrayBuffer();
        
        switch (file.type) {
            case 'application/pdf': {
                const uint8Array = new Uint8Array(buffer);
                const loadingTask = pdfjs.getDocument(uint8Array);
                const pdf = await loadingTask.promise;
                
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const pageText = content.items
                        .map(item => 'str' in item ? item.str : '')
                        .filter(Boolean)
                        .join(' ');
                    fullText += pageText + '\n';
                }
                return fullText;
            }
                
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const result = await mammoth.extractRawText({ arrayBuffer: buffer });
                return result.value;
                
            case 'text/plain':
                return new TextDecoder().decode(buffer);
                
            case 'image/png':
            case 'image/jpeg': {
                const uint8Array = new Uint8Array(buffer);
                const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
                const dataUrl = `data:${file.type};base64,${base64}`;
                const { data: { text } } = await this.worker.recognize(dataUrl);
                return text;
            }
                
            default:
                throw new Error(`Unsupported file type: ${file.type}`);
        }
    }

    private async extractMetadata(file: File): Promise<DocumentMetadata> {
        return {
            fileSize: file.size,
            format: file.type,
            lastModified: new Date(file.lastModified).toISOString()
        };
    }

    private async extractTerms(
        doc: ProcessedDocument,
        options: ProcessingOptions
    ): Promise<ExtractedTerm[]> {
        const terms: ExtractedTerm[] = [];
        
        // Prepare document
        const sentences = this.splitIntoSentences(doc.content);
        this.tfidf.addDocument(doc.content);
        
        // Extract terms using different methods based on options
        if (options.extractionMethod === 'statistical' || options.extractionMethod === 'hybrid') {
            const statisticalTerms = await this.extractStatisticalTerms(
                doc.content,
                options
            );
            terms.push(...statisticalTerms);
        }
        
        if (options.extractionMethod === 'ml' || options.extractionMethod === 'hybrid') {
            const mlTerms = await this.extractMLTerms(
                sentences,
                options
            );
            terms.push(...mlTerms);
        }
        
        // Filter and rank terms
        return this.rankAndFilterTerms(terms, options);
    }

    private splitIntoSentences(text: string): string[] {
        // Use simple regex-based sentence splitting as a fallback
        return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()) || [text];
    }

    private async extractStatisticalTerms(
        content: string,
        options: ProcessingOptions
    ): Promise<ExtractedTerm[]> {
        const terms: ExtractedTerm[] = [];
        const tokens = this.wordTokenizer.tokenize(content);
        const minConfidence = options.minConfidence || 0.1;
        
        if (!tokens) return terms;

        // Extract single words
        tokens.forEach((token: string, index: number) => {
            const tfidfScore = this.tfidf.tfidf(token, 0);
            if (tfidfScore > minConfidence) {
                terms.push({
                    term: token,
                    context: this.getContext(content, index),
                    confidence: tfidfScore,
                    frequency: this.calculateFrequency(token, tokens),
                    position: [index],
                    type: this.classifyTerm(token)
                });
            }
        });
        
        // Use our custom NGrams implementation
        const bigrams = NGrams.bigrams(tokens);
        const trigrams = NGrams.trigrams(tokens);
        
        [...bigrams, ...trigrams].forEach(gram => {
            const phrase = gram.join(' ');
            const tfidfScore = this.tfidf.tfidf(phrase, 0);
            
            if (tfidfScore > minConfidence) {
                terms.push({
                    term: phrase,
                    context: this.getContext(content, tokens.indexOf(gram[0])),
                    confidence: tfidfScore,
                    frequency: this.calculateFrequency(phrase, tokens),
                    position: [tokens.indexOf(gram[0])],
                    type: this.classifyTerm(phrase)
                });
            }
        });
        
        return terms;
    }

    private async extractMLTerms(
        sentences: string[],
        options: ProcessingOptions
    ): Promise<ExtractedTerm[]> {
        const terms: ExtractedTerm[] = [];
        const minConfidence = options.minConfidence || 0.1;
        
        for (const sentence of sentences) {
            const tokens = this.wordTokenizer.tokenize(sentence) || [];
            
            // Use sliding window to find potential multi-word terms
            for (let i = 0; i < tokens.length; i++) {
                for (let j = 1; j <= 3 && i + j <= tokens.length; j++) {
                    const phrase = tokens.slice(i, i + j).join(' ');
                    
                    // Simple heuristics for term detection
                    if (this.isLikelyTerm(phrase)) {
                        const confidence = this.calculateTermConfidence(phrase);
                        if (confidence >= minConfidence) {
                            terms.push({
                                term: phrase,
                                context: sentence,
                                confidence,
                                frequency: 1, // Will be updated in ranking phase
                                position: [sentences.indexOf(sentence)],
                                type: this.classifyTerm(phrase)
                            });
                        }
                    }
                }
            }
        }
        
        return terms;
    }

    private isLikelyTerm(phrase: string): boolean {
        // Check if the phrase matches common term patterns
        const patterns = [
            /^[A-Z][a-z]+$/, // Capitalized word
            /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)+$/, // Multiple capitalized words
            /^[A-Z][a-z]*(?:[A-Z][a-z]*)*$/, // CamelCase
            /\b(?:ROI|KPI|B2B|B2C|API|SDK|SaaS)\b/i, // Common acronyms
            /^[a-z]+(?:\s[a-z]+){0,2}$/ // 1-3 lowercase words
        ];
        
        return patterns.some(pattern => pattern.test(phrase));
    }

    private calculateTermConfidence(phrase: string): number {
        let confidence = 0.5; // Base confidence
        
        // Increase confidence based on various factors
        if (/^[A-Z]/.test(phrase)) confidence += 0.1; // Starts with capital
        if (/[A-Z]{2,}/.test(phrase)) confidence += 0.1; // Contains acronym
        if (phrase.includes(' ')) confidence += 0.1; // Multi-word term
        if (/^[A-Z][a-z]*(?:[A-Z][a-z]*)*$/.test(phrase)) confidence += 0.2; // CamelCase
        
        return Math.min(confidence, 1); // Cap at 1.0
    }

    private rankAndFilterTerms(
        terms: ExtractedTerm[],
        options: ProcessingOptions
    ): ExtractedTerm[] {
        // Remove duplicates
        const uniqueTerms = this.removeDuplicates(terms);
        
        // Sort by confidence and frequency
        const rankedTerms = uniqueTerms.sort((a, b) => {
            const scoreA = a.confidence * a.frequency;
            const scoreB = b.confidence * b.frequency;
            return scoreB - scoreA;
        });
        
        // Apply filters
        return rankedTerms
            .filter(term => term.confidence >= options.minConfidence)
            .slice(0, options.maxTerms || rankedTerms.length);
    }

    private removeDuplicates(terms: ExtractedTerm[]): ExtractedTerm[] {
        const termMap = new Map<string, ExtractedTerm>();
        
        terms.forEach(term => {
            const existing = termMap.get(term.term.toLowerCase());
            if (!existing || term.confidence > existing.confidence) {
                termMap.set(term.term.toLowerCase(), term);
            }
        });
        
        return Array.from(termMap.values());
    }

    private calculateFrequency(term: string, tokens: string[]): number {
        return tokens.filter(t => t.toLowerCase() === term.toLowerCase()).length;
    }

    private getContext(content: string, position: number, windowSize: number = 100): string {
        const start = Math.max(0, position - windowSize);
        const end = Math.min(content.length, position + windowSize);
        return content.slice(start, end).trim();
    }

    private classifyTerm(term: string): 'technical' | 'business' | 'general' {
        // Simple classification based on common patterns
        if (/^[A-Z][a-z]*(?:[A-Z][a-z]*)*$/.test(term)) {
            return 'technical'; // CamelCase usually indicates technical terms
        }
        if (/\b(?:ROI|KPI|B2B|B2C|API|SDK|SaaS)\b/i.test(term)) {
            return 'business';
        }
        return 'general';
    }

    private calculateAverageConfidence(terms: ExtractedTerm[]): number {
        if (terms.length === 0) return 0;
        const sum = terms.reduce((acc, term) => acc + term.confidence, 0);
        return sum / terms.length;
    }

    public async cleanup(): Promise<void> {
        if (this.worker) {
            await this.worker.terminate();
        }
    }
}

export const documentProcessor = (async () => {
    return await DocumentProcessor.getInstance();
})();