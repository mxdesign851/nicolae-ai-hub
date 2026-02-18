import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider as ProviderEnum } from '@prisma/client';
import OpenAI from 'openai';
import { HttpError } from '@/lib/http';

export type Provider = 'openai' | 'claude' | 'gemini';
export const REPLY_PROMPT_VERSION = 'v1.1.0';

const DEFAULT_MAX_TOKENS = 350;
const DEFAULT_TEMPERATURE = 0.6;

export type GenerateReplyInput = {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

export type GenerateReplyOutput = {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
};

export interface AIProvider {
  generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput>;
}

function ensureText(text: string, providerName: string) {
  const cleaned = text.trim();
  if (!cleaned) {
    throw new HttpError(502, `${providerName} returned empty response`);
  }
  return cleaned;
}

function estimateCostUsd(inputTokens = 0, outputTokens = 0, inputPerMillion = 0.15, outputPerMillion = 0.6) {
  return Number(((inputTokens / 1_000_000) * inputPerMillion + (outputTokens / 1_000_000) * outputPerMillion).toFixed(6));
}

class OpenAIReplyProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new HttpError(500, 'Missing OPENAI_API_KEY');
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  }

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: input.prompt }],
      temperature: input.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS
    });

    const text = ensureText(completion.choices[0]?.message?.content ?? '', 'OpenAI');
    const inputTokens = completion.usage?.prompt_tokens;
    const outputTokens = completion.usage?.completion_tokens;
    return {
      text,
      model: this.model,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens, 0.15, 0.6)
    };
  }
}

class ClaudeReplyProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new HttpError(500, 'Missing ANTHROPIC_API_KEY');
    }
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022';
  }

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
    const completion = await this.client.messages.create({
      model: this.model,
      temperature: input.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [{ role: 'user', content: input.prompt }]
    });

    const text = ensureText(
      completion.content
        .map((part) => (part.type === 'text' ? part.text : ''))
        .join('\n')
        .trim(),
      'Claude'
    );
    const inputTokens = completion.usage.input_tokens;
    const outputTokens = completion.usage.output_tokens;
    return {
      text,
      model: this.model,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens, 3, 15)
    };
  }
}

class GeminiReplyProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new HttpError(500, 'Missing GEMINI_API_KEY');
    }
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  }

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
      generationConfig: {
        temperature: input.temperature ?? DEFAULT_TEMPERATURE,
        maxOutputTokens: input.maxTokens ?? DEFAULT_MAX_TOKENS
      }
    });
    const response = result.response;
    const text = ensureText(response.text(), 'Gemini');
    const inputTokens = response.usageMetadata?.promptTokenCount;
    const outputTokens = response.usageMetadata?.candidatesTokenCount;
    return {
      text,
      model: this.model,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens, 0.075, 0.3)
    };
  }
}

export function providerToEnum(provider: Provider): ProviderEnum {
  if (provider === 'openai') return 'OPENAI';
  if (provider === 'claude') return 'CLAUDE';
  return 'GEMINI';
}

export function createProvider(provider: Provider): AIProvider {
  switch (provider) {
    case 'openai':
      return new OpenAIReplyProvider();
    case 'claude':
      return new ClaudeReplyProvider();
    case 'gemini':
      return new GeminiReplyProvider();
  }
}

export type GenerateTextArgs = {
  provider: Provider;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
};

export async function generateText({ provider, prompt, maxTokens, temperature }: GenerateTextArgs) {
  const impl = createProvider(provider);
  return impl.generateReply({
    prompt,
    maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: temperature ?? DEFAULT_TEMPERATURE
  });
}

export function extractJsonObject<T>(raw: string): T {
  const candidates: string[] = [];
  const trimmed = raw.trim();
  if (trimmed) candidates.push(trimmed);

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.unshift(fencedMatch[1].trim());
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(raw.slice(firstBrace, lastBrace + 1).trim());
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  throw new HttpError(502, 'AI returned invalid JSON payload');
}

export function buildReplyPrompt(input: {
  reviewText: string;
  rating: number;
  source: string;
  length: 'short' | 'medium' | 'long';
  targetLanguage?: string;
  brandVoice?: {
    tone: string;
    doList: string[];
    dontList: string[];
    examples: string[];
    bannedWords: string[];
    signOff?: string | null;
  } | null;
  escalation: boolean;
}) {
  const complaintKeywords = ['refund', 'rude', 'never', 'awful', 'bad service', 'disappointed', 'complaint', 'late', 'broken'];
  const shouldEscalate =
    input.escalation &&
    (input.rating <= 2 || complaintKeywords.some((keyword) => input.reviewText.toLowerCase().includes(keyword)));

  const targetLengthInstruction =
    input.length === 'short'
      ? 'Keep the reply under 70 words.'
      : input.length === 'medium'
        ? 'Keep the reply around 90-140 words.'
        : 'Keep the reply around 150-220 words.';

  return `You are an expert customer support writer for a business replying to public reviews.
Write a ${input.length} quality response for a ${input.source} review.
${targetLengthInstruction}
Rating: ${input.rating}/5
Customer review: """${input.reviewText}"""
${input.targetLanguage ? `Write in this language: ${input.targetLanguage}.` : 'Use the same language as the customer review unless unclear.'}

Brand voice:
- Tone: ${input.brandVoice?.tone ?? 'professional'}
- Must do: ${(input.brandVoice?.doList ?? []).join(', ') || 'thank the customer and reference their feedback'}
- Avoid: ${(input.brandVoice?.dontList ?? []).join(', ') || 'being defensive or dismissive'}
- Banned words: ${(input.brandVoice?.bannedWords ?? []).join(', ') || 'none'}
- Good examples: ${(input.brandVoice?.examples ?? []).join(' | ') || 'Thanks for your feedback - we appreciate your time.'}
- Sign-off preference: ${input.brandVoice?.signOff ?? 'Best regards'}

${shouldEscalate ? 'Escalation required: apologize, acknowledge issue, provide next steps, and request direct contact with support.' : 'No escalation needed unless clearly requested by the customer.'}

Return only reply text without markdown, JSON, labels, or quotes.`;
}

export function buildTagSentimentPrompt(reviewText: string, rating: number) {
  return `Analyze this customer review and return strict JSON:
{"sentiment":"POS|NEU|NEG","tags":["tag1","tag2","tag3"]}

Rules:
- sentiment should consider rating and text.
- tags must be short lowercase phrases (max 3 words each), useful for operational categorization.
- return 2-5 tags.

Rating: ${rating}/5
Review: """${reviewText}"""`;
}

export function parseTagSentimentResponse(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { sentiment?: string; tags?: string[] };
    const sentiment = parsed.sentiment === 'POS' || parsed.sentiment === 'NEG' ? parsed.sentiment : 'NEU';
    const tags = Array.isArray(parsed.tags) ? parsed.tags.filter(Boolean).slice(0, 5) : [];
    return { sentiment, tags };
  } catch {
    return { sentiment: 'NEU' as const, tags: [] as string[] };
  }
}
