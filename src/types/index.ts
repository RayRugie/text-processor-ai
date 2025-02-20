// src/types/index.ts
export interface Message {
    id: string;
    text: string;
    timestamp: Date;
    language?: string;
    translation?: string;
    summary?: string;
  }
  
  export interface Language {
    value: string;
    label: string;
  }