import { 
    ProcessedDocument, 
    DocumentMetadata, 
    ExtractedTerm, 
    ProcessingResult, 
    ProcessingOptions 
} from '../types';
import natural from 'natural';
import { createWorker, Worker, createScheduler } from 'tesseract.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

interface NounPhrase {
    text: string;
    confidence: number;
}

interface TaggedToken {
    token: string;
    tag: string;
}

export class DocumentProcessor {
    private static instance: DocumentProcessor;
    private worker: Worker;
    private tfidf: natural.TfIdf;
    private wordTokenizer: natural.WordTokenizer;
    private tagger: natural.BrillPOSTagger;
    private lexicon: natural.Lexicon;
    private ruleSet: natural.RuleSet;

    private constructor() {
        // Initialize natural language processing components
        this.tfidf = new natural.TfIdf();
        this.wordTokenizer = new natural.WordTokenizer();
        
        // Initialize POS tagger with English lexicon and rule set
        this.lexicon = new natural.Lexicon('EN', 'EC');
        this.ruleSet = new natural.RuleSet('EN');
        this.tagger = new natural.BrillPOSTagger(this.lexicon, this.ruleSet);
        
        this.initializeWorker();
    }

    public static getInstance(): DocumentProcessor {
        if (!DocumentProcessor.instance) {
            DocumentProcessor.instance = new DocumentProcessor();
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
            case 'application/pdf':
                const pdfData = await pdfParse(buffer);
                return pdfData.text;
                
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const result = await mammoth.extractRawText({ arrayBuffer: buffer });
                return result.value;
                
            case 'text/plain':
                return new TextDecoder().decode(buffer);
                
            case 'image/png':
            case 'image/jpeg': {
                // Convert ArrayBuffer to base64 for Tesseract.js
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
        
        if (!tokens) return terms;

        // Extract single words
        tokens.forEach((token: string, index: number) => {
            const tfidfScore = this.tfidf.tfidf(token, 0);
            if (tfidfScore > options.minConfidence) {
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
        
        // Extract phrases (bigrams and trigrams)
        const bigrams = natural.NGrams.bigrams(tokens);
        const trigrams = natural.NGrams.trigrams(tokens);
        
        [...bigrams, ...trigrams].forEach(gram => {
            const phrase = gram.join(' ');
            const tfidfScore = this.tfidf.tfidf(phrase, 0);
            
            if (tfidfScore > options.minConfidence) {
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
        
        for (const sentence of sentences) {
            const tokens = this.wordTokenizer.tokenize(sentence) || [];
            const tagged = this.tagger.tag(tokens);
            
            // Extract noun phrases and technical terms
            const nounPhrases = this.extractNounPhrases(tagged.taggedWords);
            
            nounPhrases.forEach(phrase => {
                terms.push({
                    term: phrase.text,
                    context: sentence,
                    confidence: phrase.confidence,
                    frequency: 1, // Will be updated in ranking phase
                    position: [sentences.indexOf(sentence)],
                    type: this.classifyTerm(phrase.text)
                });
            });
        }
        
        return terms;
    }

    private extractNounPhrases(tagged: Array<{ token: string; tag: string }>): NounPhrase[] {
        const phrases: NounPhrase[] = [];
        let currentPhrase: string[] = [];
        
        tagged.forEach((token) => {
            if (token.tag.startsWith('NN')) { // Noun
                currentPhrase.push(token.token);
            } else if (token.tag === 'JJ' && currentPhrase.length > 0) { // Adjective
                currentPhrase.push(token.token);
            } else if (currentPhrase.length > 0) {
                phrases.push({
                    text: currentPhrase.join(' '),
                    confidence: 0.8 // Base confidence for ML-extracted terms
                });
                currentPhrase = [];
            }
        });
        
        if (currentPhrase.length > 0) {
            phrases.push({
                text: currentPhrase.join(' '),
                confidence: 0.8
            });
        }
        
        return phrases;
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

export const documentProcessor = DocumentProcessor.getInstance();