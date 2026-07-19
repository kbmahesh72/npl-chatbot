import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

class HostedModelFallbackError extends Error {}

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "can",
  "could",
  "does",
  "for",
  "from",
  "happen",
  "have",
  "how",
  "into",
  "is",
  "me",
  "of",
  "on",
  "or",
  "please",
  "rule",
  "rules",
  "should",
  "tell",
  "the",
  "their",
  "there",
  "this",
  "to",
  "what",
  "when",
  "who",
  "with",
  "you"
]);

const QUERY_SYNONYMS: Record<string, string[]> = {
  dress: ["uniform", "uniforms", "clothing", "shorts", "shoes", "cleats"],
  dressing: ["uniform", "uniforms", "clothing", "shorts", "shoes", "cleats"],
  attire: ["uniform", "uniforms", "clothing", "shorts", "shoes", "cleats"],
  clothes: ["uniform", "uniforms", "clothing", "shorts"],
  shorts: ["uniform", "uniforms", "clothing"],
  shoe: ["shoes", "cleats", "spiked"],
  shoes: ["cleats", "spiked"]
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function expandQueryWords(words: string[]) {
  return words.flatMap((word) => [word, ...(QUERY_SYNONYMS[word] || [])]);
}

function splitContext(context: string) {
  return context
    .split(/\n(?=#{1,4}\s)|\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);
}

function selectRelevantContext(context: string, question: string) {
  const words = expandQueryWords(tokenize(question));
  const query = new Set(words);
  const scored = splitContext(context).map((section, index) => {
    const sectionWords = tokenize(section);
    const score = sectionWords.reduce((sum, word) => sum + (query.has(word) ? 1 : 0), 0);
    return { section, index, score };
  });

  const ranked = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 8);

  if (ranked.length === 0) {
    return splitContext(context).slice(0, 5).join("\n\n");
  }

  return ranked.map((item) => item.section).join("\n\n");
}

function fallbackAnswer(relevantContext: string, question: string) {
  return [
    "I found these relevant rules in the tournament document:",
    "",
    `Question: ${question}`,
    "",
    relevantContext
  ].join("\n");
}

function cleanModelText(text: string) {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .trim();
}

type HuggingFaceResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

async function answerWithHuggingFace(
  question: string,
  relevantContext: string,
  history: HistoryMessage[]
) {
  const model = process.env.HF_MODEL || "openai/gpt-oss-20b:fastest";
  const prompt = [
    "Rules context:",
    relevantContext,
    "",
    "Recent chat:",
    history.map((message) => `${message.role}: ${message.content}`).join("\n"),
    "",
    `Question: ${question}`
  ].join("\n");

  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful cricket tournament rules assistant. Answer only from the provided rules context. If the context does not answer the question, say that the rules document does not specify it. Keep answers concise and practical for team members. Use plain text only. Do not use Markdown, asterisks, bold text, tables, or code formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false,
      temperature: 0.2,
      max_tokens: 700
    })
  });

  if (!response.ok) {
    const details = await response.text();
    if ([402, 429, 503].includes(response.status)) {
      throw new HostedModelFallbackError(`Hugging Face hosted inference unavailable: ${details}`);
    }
    throw new Error(`Hugging Face request failed: ${details}`);
  }

  const data = (await response.json()) as HuggingFaceResponse;
  const output = data.choices?.[0]?.message?.content?.trim();

  return output ? cleanModelText(output) : "The model did not return an answer.";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      question?: unknown;
      history?: HistoryMessage[];
    };
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const contextPath = path.join(process.cwd(), "data", "cricket-rules.md");
    const context = await readFile(contextPath, "utf-8");
    const relevantContext = selectRelevantContext(context, question);
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    if (!process.env.HF_TOKEN) {
      return NextResponse.json({ answer: fallbackAnswer(relevantContext, question) });
    }

    const answer = await answerWithHuggingFace(question, relevantContext, history).catch((error) => {
      if (error instanceof HostedModelFallbackError) {
        return fallbackAnswer(relevantContext, question);
      }
      throw error;
    });
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while answering the question."
      },
      { status: 500 }
    );
  }
}
