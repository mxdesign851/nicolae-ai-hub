import OpenAI from 'openai';
import { AIProvider as ProviderEnum } from '@prisma/client';
import { HttpError } from '@/lib/http';

export type Provider = 'openai' | 'claude' | 'gemini';
export const REPLY_PROMPT_VERSION = 'v1.0.0';

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

function estimateOpenAICost(inputTokens = 0, outputTokens = 0) {
  // gpt-4o-mini list price snapshot (USD per 1M tokens); configurable if needed.
  const inputPerMillion = 0.15;
  const outputPerMillion = 0.6;
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
      temperature: input.temperature ?? 0.6,
      max_tokens: input.maxTokens ?? 350
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? '';
    const inputTokens = completion.usage?.prompt_tokens;
    const outputTokens = completion.usage?.completion_tokens;
    return {
      text,
      model: this.model,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateOpenAICost(inputTokens, outputTokens)
    };
  }
}

class ClaudeReplyProvider implements AIProvider {
  async generateReply(): Promise<GenerateReplyOutput> {
    // TODO: Wire Anthropic SDK request/usage extraction.
    // Required env keys: ANTHROPIC_API_KEY, ANTHROPIC_MODEL.
    throw new HttpError(501, 'Claude provider stub not implemented yet. Configure ANTHROPIC_API_KEY and ANTHROPIC_MODEL.');
  }
}

class GeminiReplyProvider implements AIProvider {
  async generateReply(): Promise<GenerateReplyOutput> {
    // TODO: Wire Gemini REST/OpenAI-compatible call and token usage extraction.
    // Required env keys: GEMINI_API_KEY, GEMINI_MODEL (optional GEMINI_BASE_URL).
    throw new HttpError(501, 'Gemini provider stub not implemented yet. Configure GEMINI_API_KEY and GEMINI_MODEL.');
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

export async function generateText({ provider, prompt }: { provider: Provider; prompt: string }) {
  const impl = createProvider(provider);
  return impl.generateReply({ prompt, maxTokens: 350, temperature: 0.6 });
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
