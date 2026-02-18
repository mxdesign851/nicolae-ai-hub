import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

type Provider = 'openai' | 'claude' | 'gemini';

type GenerateParams = {
  provider: Provider;
  prompt: string;
};

export async function generateText({ provider, prompt }: GenerateParams) {
  if (provider === 'openai') {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    return res.choices[0]?.message?.content?.trim() ?? '';
  }

  if (provider === 'claude') {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20240620',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    });
    const first = res.content.find((c) => c.type === 'text');
    return (first && 'text' in first ? first.text : '').trim();
  }

  // Gemini currently uses OpenAI-compatible endpoint (set GEMINI_BASE_URL + key)
  const client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/'
  });
  const res = await client.chat.completions.create({
    model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  return res.choices[0]?.message?.content?.trim() ?? '';
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
  const complaintKeywords = ['refund', 'rude', 'never', 'awful', 'bad service', 'disappointed', 'complaint'];
  const shouldEscalate =
    input.escalation &&
    (input.rating <= 2 || complaintKeywords.some((keyword) => input.reviewText.toLowerCase().includes(keyword)));

  return `You are an expert customer support writer.
Create a ${input.length} review reply for a ${input.source} review.
Rating: ${input.rating}/5.
Review text: "${input.reviewText}".
${input.targetLanguage ? `Reply language: ${input.targetLanguage}.` : ''}
Brand voice:
- Tone: ${input.brandVoice?.tone ?? 'professional'}
- Do: ${(input.brandVoice?.doList ?? []).join(', ') || 'be polite, acknowledge review'}
- Don't: ${(input.brandVoice?.dontList ?? []).join(', ') || 'no defensiveness'}
- Banned words: ${(input.brandVoice?.bannedWords ?? []).join(', ') || 'none'}
- Sign-off: ${input.brandVoice?.signOff ?? 'Best regards'}
${shouldEscalate ? 'This is an escalated case. Include apology, resolution steps and ask customer to contact support.' : ''}
Output only the final reply text.`;
}
