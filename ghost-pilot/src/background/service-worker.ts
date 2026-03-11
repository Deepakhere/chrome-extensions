// GhostPilot Background Service Worker
// Handles Gemini API calls to avoid CORS issues from content scripts

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

async function getApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get("ghostpilot_api_key");
  return result.ghostpilot_api_key || null;
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      throw new Error(
        "Rate limit exceeded. Your Gemini free-tier quota is exhausted. " +
        "Either wait for the quota to reset, or enable billing at https://aistudio.google.com to get higher limits."
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid API key. Please check your Gemini API key and try again.");
    }
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Invalid response from Gemini API");
  }

  return text;
}

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === "PLAN_ACTIONS") {
      handlePlanRequest(message as PlanRequest)
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
  }
);

async function handlePlanRequest(
  message: PlanRequest
): Promise<{ data: string } | { error: string }> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { error: "API_KEY_MISSING" };
  }

  const systemPrompt = `You are GhostPilot, an AI web automation agent. You analyze web page elements and create step-by-step action plans to perform user-requested tasks.

You receive a snapshot of interactive elements on a web page. Each element has:
- An ID like [el-0], [el-1], etc.
- Tag name and attributes
- Visible text content
- Current state (disabled, checked, value, etc.)

Your job is to convert the user's natural language instruction into a precise action plan.

Available actions:
- "click" - Click an element
- "type" - Type text into an input/textarea (requires "value" field)
- "select" - Select an option in a dropdown (requires "value" field)
- "check" - Check a checkbox
- "uncheck" - Uncheck a checkbox
- "clear" - Clear an input field
- "hover" - Hover over an element
- "scroll-to" - Scroll to an element
- "wait" - Wait for ms (requires "value" like "1000")
- "press-key" - Press a key (requires "value" like "Enter")

Rules:
1. Reference elements ONLY by their [el-N] IDs from the snapshot
2. Use the minimum number of steps needed
3. For destructive actions, add a warning
4. For form filling with "test data", use realistic fake data
5. If the task is impossible with available elements, explain in reasoning and return empty steps

Respond ONLY with valid JSON:
{
  "reasoning": "Brief explanation",
  "steps": [
    { "step": 1, "action": "click", "elementId": "el-5", "description": "Click Submit" }
  ],
  "warnings": []
}`;

  const userPrompt = `## Page Snapshot:\n\n${message.dom}\n\n## Task:\n${message.prompt}`;

  try {
    const responseText = await callGemini(systemPrompt, userPrompt, apiKey);
    return { data: responseText };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

console.log("GhostPilot service worker initialized");
