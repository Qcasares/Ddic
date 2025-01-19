declare module 'pdf-parse' {
    interface PDFData {
        text: string;
        numpages: number;
        info: {
            Author?: string;
            CreationDate?: string;
            ModDate?: string;
            Producer?: string;
            Title?: string;
        };
    }

    function parse(dataBuffer: Buffer | ArrayBuffer | Uint8Array): Promise<PDFData>;
    export = parse;
}