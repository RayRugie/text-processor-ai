import React, { useState, useRef, useEffect } from 'react';
import Select from 'react-select';
import { IoSend } from 'react-icons/io5';
import { Message, Language } from '../types';
import { TextProcessingService } from '../services/apiService';
import './ChatInterface.scss';

const languages: Language[] = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'es', label: 'Spanish' },
  { value: 'ru', label: 'Russian' },
  { value: 'tr', label: 'Turkish' },
  { value: 'fr', label: 'French' },
];

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(languages[0]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [summarizing, setSummarizing] = useState<Record<string, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<{ loaded: number; total: number } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // if ('ai' in self && 'languageDetector' in (self as any).ai) {
    //   console.log("The Language Detector API is available.")
    // }  

    // if ('ai' in self && 'translator' in (self as any).ai) {
    //   alert("The Translator API is supported.")
    // }
    // if ('ai' in self && 'summarizer' in self.ai) {
    //   alert("The Summarizer API is supported.")
    // }
    scrollToBottom();
  }, [messages]);

  const detectLanguage = async (e: React.ChangeEvent<HTMLTextAreaElement>): Promise<void> => {
    const text = e.target.value;
    setInputText(text);
    
    if (!text.trim()) {
      setSourceLanguage("");
      return;
    }
    
    try {
      const languageDetectorCapabilities = await (self as any).ai.languageDetector.capabilities();
      const canDetect = languageDetectorCapabilities.capabilities;
      let detector;
      if (canDetect === 'no') {
        // The language detector isn't usable.
        console.log(null);
        return;
      }
      if (canDetect === 'readily') {
        // The language detector can immediately be used.
        detector = await (self as any).ai.languageDetector.create();
      } else {
        // The language detector can be used after model download.
        detector = await (self as any).ai.languageDetector.create({
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
            });
          },
        });
        await detector.ready;
      }
      
      const results = await detector.detect(text);
      for (const result of results) {
        setSourceLanguage(result.detectedLanguage);
        break;
      }  
    } catch (error) {
      console.error('Language Detection Error:', error);
      setError('Language detection failed');
    }
  };

  const summarizeText = async (text: string): Promise<string> => {
    try {
      return await TextProcessingService.summarizeText(text);
    } catch (error) {
      setError('Summarization failed');
      throw error;
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text');
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      timestamp: new Date(),
      language: sourceLanguage || 'unknown',
    };

    try {
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      setError(null);
    } catch (error) {
      setError('Failed to process message');
    }
  };

  const handleSummarize = async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    // Set summarizing state for this message
    setSummarizing(prev => ({ ...prev, [messageId]: true }));
    setError(null);
    setDownloadProgress(null);

    try {
      const message = messages[messageIndex];
      
      // Create progress handler
      const handleProgress = (e: { loaded: number; total: number }) => {
        setDownloadProgress(e);
      };

      // Get summary
      const summary = await TextProcessingService.summarizeText(message.text);
      
      // Update message with summary
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        summary,
      };
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Summarization error:', error);
      setError(error instanceof Error ? error.message : 'Failed to summarize text');
    } finally {
      setSummarizing(prev => ({ ...prev, [messageId]: false }));
      setDownloadProgress(null);
    }
  };

  const handleTranslate = async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;
    
    const message = messages[messageIndex];
    const selectedLang = selectedLanguage.value;
    const sourceLang = message.language || 'auto';
    
    try {
      const translation = await TextProcessingService.translateText(
        message.text,
        sourceLang,
        selectedLang
      );
      
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        translation,
      };
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Summarization error:', error);
      setError(error instanceof Error ? error.message : 'Failed to summarize text');
    } finally {
      setSummarizing(prev => ({ ...prev, [messageId]: false }));
      setDownloadProgress(null);
    }
  };

  return (
    <div className="chat-interface">
      <div className="messages-container" role="log" aria-label="Chat messages">
        {messages.map((message) => (
          <div key={message.id} className="message">
            <p className="message-text">{message.text}</p>
            <p className="message-language">
              Detected Language: {message.language}
            </p>
            
            {message.language === 'en' && message.text.length > 150 && (
              <div className="summary-controls">
                <button
                  onClick={() => handleSummarize(message.id)}
                  className={`action-button ${summarizing[message.id] ? 'loading' : ''}`}
                  disabled={summarizing[message.id]}
                  aria-label="Summarize text"
                >
                  {summarizing[message.id] ? 'Summarizing...' : 'Summarize'}
                </button>
                
                {summarizing[message.id] && downloadProgress && (
                  <div className="progress-bar">
                    <div 
                      className="progress"
                      style={{ 
                        width: `${(downloadProgress.loaded / downloadProgress.total) * 100}%` 
                      }}
                    />
                    <span className="progress-text">
                      {Math.round((downloadProgress.loaded / downloadProgress.total) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {message.summary && (
              <div className="summary">
                <h4>Summary:</h4>
                <div className="summary-content">
                  {message.summary}
                </div>
              </div>
            )}

            <div className="translation-controls">
              <Select
                options={languages}
                value={selectedLanguage}
                onChange={(lang) => lang && setSelectedLanguage(lang)}
                className="language-select"
                aria-label="Select target language"
              />
              <button
                onClick={() => handleTranslate(message.id)}
                className="action-button"
                aria-label="Translate text"
              >
                Translate
              </button>
            </div>

            {message.translation && (
              <div className="translation">
                <h4>Translation ({selectedLanguage.label}):</h4>
                <p>{message.translation}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="input-container">
        <textarea
          value={inputText}
          onChange={detectLanguage}
          placeholder="Type your message..."
          className="input-field"
          aria-label="Message input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          className="send-button"
          aria-label="Send message"
        >
          <IoSend />
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;