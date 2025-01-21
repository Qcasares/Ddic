declare module 'react-router-dom' {
  export * from 'react-router';
}

declare module 'openai' {
  export interface Configuration {
    apiKey: string;
    organization?: string;
    baseURL?: string;
  }

  export interface CompletionParams {
    model: string;
    prompt: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    n?: number;
    stream?: boolean;
    stop?: string | string[];
    presence_penalty?: number;
    frequency_penalty?: number;
    user?: string;
  }

  export interface CompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
      text: string;
      index: number;
      logprobs: null | number;
      finish_reason: string;
    }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }

  export class OpenAIApi {
    constructor(config: Configuration);
    createCompletion: (params: CompletionParams) => Promise<CompletionResponse>;
  }
}
