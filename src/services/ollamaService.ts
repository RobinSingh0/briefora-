import axios from 'axios';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Queue System: Limit concurrent AI requests (max 3)
class AIQueue {
  private queue: (() => void)[] = [];
  private activeCount = 0;
  private readonly maxConcurrent = 3;

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    
    this.activeCount++;
    try {
      return await task();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      }
    }
  }
}

const aiQueue = new AIQueue();

// Timeout Wrapper
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), timeoutMs))
  ]);
};

export const summarizeText = async (text: string, description?: string): Promise<string> => {
  // Safety: Limit input to 10,000 chars (approx 2,500 tokens) to avoid context overflow
  const safeText = text.length > 10000 ? text.slice(0, 10000) : text;

  // Smart Fallback: Extract first two sentences (Fix 3)
  const getSmartFallback = (input: string) => {
    const sentences = input.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
    if (sentences.length >= 2) {
      return (sentences[0] + ' ' + sentences[1]).trim();
    }
    return input.length > 150 ? input.slice(0, 150) + '...' : input;
  };

  const fallbackSummary = description 
    ? (description.length > 180 ? description.slice(0, 180) + '...' : description)
    : getSmartFallback(safeText);

  return aiQueue.run(async () => {
    const aiPromise = (async () => {
      try {
        // 1. Try Local Ollama first
        const response = await axios.post(OLLAMA_ENDPOINT, {
          model: 'ministral-3:14b',
          prompt: `Summarize the following news article in exactly 60 words. Keep it professional and concise: ${safeText}`,
          stream: false,
          options: {
            num_ctx: 16384, // Increased workspace for longer articles
          }
        }, { timeout: 12000 }); // Internal axios timeout slightly less than global 15s

        return response.data.response;
      } catch (error) {
        console.warn('Ollama failed, falling back to Groq:', error);
        
        // 2. Fallback to Groq
        if (!GROQ_API_KEY || GROQ_API_KEY === 'gsk_your_actual_key_here') {
          return fallbackSummary;
        }

        try {
          const groqResponse = await axios.post(GROQ_ENDPOINT, {
            model: 'llama-3.3-70b-specdec',
            messages: [
              { role: 'system', content: 'You are a professional news editor. Summarize articles in exactly 60 words.' },
              { role: 'user', content: safeText }
            ],
            max_tokens: 150,
          }, {
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 8000
          });

          return groqResponse.data.choices[0].message.content;
        } catch (groqError) {
          console.error('Groq fallback also failed:', groqError);
          return fallbackSummary;
        }
      }
    })();

    // 15s Global "Force-Start" Timeout (Fix 2)
    return withTimeout(aiPromise, 15000, fallbackSummary);
  });
};

export const categorizeText = async (text: string): Promise<string> => {
  const categories = ['TECH', 'WORLD', 'BUSINESS', 'HEALTH', 'SCIENCE', 'ENTERTAINMENT', 'SPORTS'];
  // Safety: Limit input to 10,000 chars
  const safeText = text.length > 10000 ? text.slice(0, 10000) : text;
  
  return aiQueue.run(async () => {
    try {
      const response = await axios.post(OLLAMA_ENDPOINT, {
        model: 'ministral-3:14b',
        prompt: `Categorize this news article into exactly one of these: ${categories.join(', ')}. Return ONLY the category name: ${safeText}`,
        stream: false,
        options: {
          num_ctx: 4096, // Categorization needs less context
        }
      }, { timeout: 5000 });

      return response.data.response.trim().toUpperCase();
    } catch (error) {
      console.warn('Ollama categorization failed, falling back to Groq:', error);

      if (!GROQ_API_KEY || GROQ_API_KEY === 'gsk_your_actual_key_here') {
        return 'WORLD'; 
      }

      try {
        const groqResponse = await axios.post(GROQ_ENDPOINT, {
          model: 'llama-3.3-70b-specdec',
          messages: [
            { role: 'system', content: `Classify news into exactly one of these: ${categories.join(', ')}. Return ONLY the word.` },
            { role: 'user', content: safeText }
          ],
        }, {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        return groqResponse.data.choices[0].message.content.trim().toUpperCase();
      } catch (groqError) {
        return 'WORLD';
      }
    }
  });
};

export const checkAIHealth = async (): Promise<boolean> => {
  try {
    const healthUrl = 'http://localhost:11434';
    await axios.get(healthUrl, { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
};
