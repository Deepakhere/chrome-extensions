import { buildPrompt } from "../ai/prompt-builder";

interface PlanRequest {
  type: "PLAN_ACTIONS";
  dom: string;
  prompt: string;
}

interface ApiKeyRequest {
  type: "SET_API_KEY" | "GET_API_KEY";
  key?: string;
}

type Message = PlanRequest | ApiKeyRequest;

const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (Fast)", tokens: 8192 },
  { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", tokens: 8192 },
  { id: "llama-3.2-90b-versatile", name: "Llama 3.2 90B", tokens: 8192 },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", tokens: 32768 },
];

async function getApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get("ghostpilot_api_key");
  return result.ghostpilot_api_key || null;
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  screenshotBase64?: string,
): Promise<string> {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODELS[0].id,
      messages,
      temperature: 0.1,
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Invalid API key. Please check your Groq API key and try again. Get a new key at https://console.groq.com",
      );
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds and try again.`,
      );
    }

    if (response.status === 400) {
      try {
        const err = JSON.parse(errorText);
        if (err?.error?.message?.includes("json_object")) {
          throw new Error("AI response format issue. Please try again.");
        }
      } catch {}
    }

    throw new Error(
      `API error (${response.status}): ${errorText.slice(0, 100)}`,
    );
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Empty response from AI. Please try again.");
  }

  return text;
}

chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    if (message.type === "PLAN_ACTIONS") {
      handlePlanRequest(message as PlanRequest, sender)
        .then(sendResponse)
        .catch((err) => sendResponse({ error: err.message }));
      return true;
    }

    if (message.type === "SET_API_KEY") {
      chrome.storage.local
        .set({ ghostpilot_api_key: (message as ApiKeyRequest).key })
        .then(() => sendResponse({ ok: true }));
      return true;
    }

    if (message.type === "GET_API_KEY") {
      getApiKey().then((key) => sendResponse({ key }));
      return true;
    }

    return false;
  },
);

async function handlePlanRequest(
  message: PlanRequest,
  sender: chrome.runtime.MessageSender,
): Promise<{ data: string } | { error: string }> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { error: "API_KEY_MISSING" };
  }

  const { system: systemPrompt, user: userPrompt } = buildPrompt(
    message.dom,
    message.prompt,
  );

  console.log("GhostPilot: Sending prompt to Groq API...");

  try {
    const responseText = await callGroq(systemPrompt, userPrompt, apiKey);
    console.log("GhostPilot: Received response from AI");
    return { data: responseText };
  } catch (err) {
    console.error("GhostPilot: API error:", err);
    return { error: (err as Error).message };
  }
}

console.log("GhostPilot service worker initialized - v1.1.0");
