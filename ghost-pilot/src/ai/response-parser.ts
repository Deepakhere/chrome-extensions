import type { ActionPlan } from "../core/types";

export function parseAIResponse(responseText: string): ActionPlan {
  // Try to extract JSON from the response
  let jsonStr = responseText.trim();

  // Handle markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try to find JSON object in the response
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No valid JSON found in AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate structure
  if (!parsed.reasoning || !Array.isArray(parsed.steps)) {
    throw new Error("Invalid action plan structure");
  }

  for (const step of parsed.steps) {
    if (!step.step || !step.action || !step.description) {
      throw new Error(`Invalid step: ${JSON.stringify(step)}`);
    }
    if (!step.elementId && step.action !== "wait") {
      throw new Error(`Step ${step.step} missing elementId`);
    }
  }

  return {
    reasoning: parsed.reasoning,
    steps: parsed.steps,
    warnings: parsed.warnings || [],
  };
}
