export class WordTokenizer {
  tokenize(text: string): string[] {
    return text.match(/\b\w+\b/g) || [];
  }
}

export class TfIdf {
  private documents: string[][] = [];
  
  addDocument(text: string) {
    const tokens = text.toLowerCase().match(/\b\w+\b/g) || [];
    this.documents.push(tokens);
  }
  
  tfidf(term: string, docIndex: number): number {
    return this.tf(term, docIndex) * this.idf(term);
  }
  
  private tf(term: string, docIndex: number): number {
    const doc = this.documents[docIndex];
    const termCount = doc.filter(t => t === term.toLowerCase()).length;
    return termCount / doc.length;
  }
  
  private idf(term: string): number {
    const docsWithTerm = this.documents.filter(doc => 
      doc.some(t => t === term.toLowerCase())
    ).length;
    return Math.log(this.documents.length / (1 + docsWithTerm));
  }
}

export class NGrams {
  static bigrams(words: string[]): string[][] {
    return this.getNGrams(words, 2);
  }
  
  static trigrams(words: string[]): string[][] {
    return this.getNGrams(words, 3);
  }
  
  private static getNGrams(words: string[], n: number): string[][] {
    const ngrams = [];
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n));
    }
    return ngrams;
  }
}