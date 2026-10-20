// Server-only adapter. Use a Groq Free account; this code never changes billing.
export const GROQ_MODEL = "openai/gpt-oss-20b";

export async function groqJson(system: string, user: string, apiKey: string, fetcher: typeof fetch = fetch) {
  if (!apiKey.trim()) throw new Error("AI is not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
        reasoning_effort: "low",
        temperature: 0.15,
        max_completion_tokens: 1024,
        stream: false,
      }),
    });
    // Never log a provider response body: it may echo private input or credentials.
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(response.status === 429 ? "AI allowance reached" : "AI provider is temporarily unavailable");
    }
    const data = await response.json();
    const choice = data?.choices?.[0];
    if (choice?.finish_reason !== "stop" || typeof choice?.message?.content !== "string") {
      throw new Error("AI returned incomplete output");
    }
    const value = JSON.parse(choice.message.content);
    if (!value || Array.isArray(value) || typeof value !== "object" || !Object.keys(value).length) {
      throw new Error("AI returned invalid structured output");
    }
    return value;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("AI provider timed out");
    const safeMessages = ["AI allowance reached", "AI provider is temporarily unavailable", "AI returned incomplete output", "AI returned invalid structured output"];
    // JSON parser and transport exceptions can contain response or request data.
    throw new Error(error instanceof Error && safeMessages.includes(error.message) ? error.message : "AI returned invalid structured output");
  } finally {
    clearTimeout(timeout);
  }
}
