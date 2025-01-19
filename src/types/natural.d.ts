declare module 'natural' {
    export class TfIdf {
        constructor();
        addDocument(doc: string): void;
        tfidf(term: string, docIndex: number): number;
    }

    export class WordTokenizer {
        constructor();
        tokenize(text: string): string[];
    }

    export class Lexicon {
        constructor(language: string, defaultCategory: string);
    }

    export class RuleSet {
        constructor(language: string);
    }

    export class BrillPOSTagger {
        constructor(lexicon: Lexicon, ruleSet: RuleSet);
        tag(words: string[]): { taggedWords: Array<{ token: string; tag: string }> };
    }

    export class NGrams {
        static bigrams(words: string[]): string[][];
        static trigrams(words: string[]): string[][];
    }
}