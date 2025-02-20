// src/services/apiService.ts
// Remove Node.js specific imports that won't work in browser
// import { TranslationServiceClient } from '@google-cloud/translate';
// import { LanguageServiceClient } from '@google-cloud/language';

// Don't initialize these clients in browser environment
// const translationClient = new TranslationServiceClient();
// const languageClient = new LanguageServiceClient();

export class TextProcessingService {
  // Detect language using Chrome AI API instead of Google Cloud
  static async detectLanguage(text: string): Promise<string> {
    try {
      if (!('ai' in self) || !('languageDetector' in (self as any).ai)) {
        throw new Error('Chrome AI Language Detector API not available');
      }

      const detector = await (self as any).ai.languageDetector.create();
      await detector.ready;
      
      const results = await detector.detect(text);
      if (results && results.length > 0) {
        return results[0].detectedLanguage || 'unknown';
      }
      return 'unknown';
    } catch (error) {
      console.error('Language detection error:', error);
      throw new Error('Failed to detect language');
    }
  }

  // Placeholder summarization using basic algorithm
  // Since we don't have Google Cloud in browser
  static async summarizeText(text: string): Promise<string> {
    try {
      // Simple summarization approach
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // If text is short, return it as-is
      if (sentences.length <= 3) {
        return text;
      }
      
      // Select first and last sentences plus one from the middle
      const summary = [
        sentences[0],
        sentences[Math.floor(sentences.length / 2)],
        sentences[sentences.length - 1]
      ].join('. ');
      
      return summary || 'No summary available';
    } catch (error) {
      console.error('Summarization error:', error);
      throw new Error('Failed to summarize text');
    }
  }

  // Translate text using Chrome AI API
  static async translateText(
    text: string, 
    sourceLanguage: string, 
    targetLanguage: string
  ): Promise<string> {
    try {
      // Check if Chrome AI translator is available
      if (!('ai' in self) || !('translator' in (self as any).ai)) {
        throw new Error('Chrome AI Translator API not available');
      }

      const translator = await (self as any).ai.translator.create({
        sourceLanguage,
        targetLanguage,
        monitor(m: any) {
          m.addEventListener('downloadprogress', (e: any) => {
            console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
          });
        },
      });

      await translator.ready;
      const translatedText = await translator.translate(text);
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('Failed to translate text');
    }
  }
}