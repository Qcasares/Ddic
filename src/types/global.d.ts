declare module 'react-router-dom' {
  export * from 'react-router';
}

declare module 'openai' {
  export interface Configuration {
    apiKey: string;
  }

  export class OpenAIApi {
    constructor(config: Configuration);
    createCompletion: (params: any) => Promise<any>;
  }
}