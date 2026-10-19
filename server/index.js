import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.GEMINI_MODEL || "gemini-4-argon";

const schemaGuide = `Return only valid JSON with this structure:
{
 "executiveSummary":"string",
 "decision":"string",
 "confidence":"Low | Medium | High",
 "riskScore": number from 0 to 100,
 "keyUnknowns":["string"],
 "risks":[{"title":"string","severity":"Critical | High | Moderate | Low","likelihood":"Low | Medium | High | Unknown","impact":"Low | Medium | High | Unknown","whyItMatters":"string","mitigation":"string","evidenceNeeded":["string"]}],
 "compliance":[{"area":"string","requirement":"string","whyRelevant":"string","sourceName":"string","sourceUrl":"string","status":"Needs verification | Likely applicable | User-provided | Not determined"}],
 "qualityChecklist":["string"],
 "supplierChecks":["string"],
 "paymentControls":["string"],
 "logisticsChecks":["string"],
 "workflow":[{"name":"string","detail":"string","gate":true}],
 "futureScenarios":[{"horizon":"3 years | 6 years | 10 years","scenario":"string","watchSignals":["string"],"response":"string"}],
 "nextActions":["string"],
 "disclaimer":"string"
}
Do not invent sources, certificates, supplier facts, current availability, laws, or export classifications. If you cannot verify a source URL, leave sourceUrl blank and mark the requirement as needing verification. Treat this as decision support, not legal, engineering, airworthiness, export-classification, or quality-release approval. Distinguish facts from assumptions and missing evidence. Never declare a component authentic or compliant based only on a supplier's claim. For controlled or safety/mission-critical components, recommend qualified human review.`;

function buildPrompt(input) {
  return `You are ASCIA, an evidence-conscious Aerospace & Space Supply Chain Intelligence Analyst.
Create a preliminary, part-specific analysis based on the user's information. Be specific and useful, but never pretend you performed live web research unless tools/results were actually provided. In this app, you have no web search tool; therefore identify official sources the operator should check and mark current regulatory status as needing verification. Avoid giving detailed export-control determinations from a part name alone.
${schemaGuide}

USER INPUT:
${JSON.stringify(input, null, 2)}

Requirements:
- Include risks for product/mission assurance, counterfeit/provenance, supplier verification, compliance/export-import, payment fraud, logistics/delivery, cyber/IP, supplier concentration and data gaps as relevant.
- Tailor standards and checks to the component family and intended use. Do not assume every ECSS, NASA, AS9100, FAA, EASA or SCOMET requirement applies.
- In compliance sources, prefer official sources such as DGFT, IN-SPACe, MCA, IAQG, ECSS, NASA, FAA, EASA and EUR-Lex. URLs are suggestions to verify, not evidence of current applicability.
- Keep riskScore as a transparent preliminary prioritization score, not a probability of failure. Explain the basis in executiveSummary.
- Add a workflow from specification and supplier review through PO, production, inspection, dispatch, delivery acceptance and invoice/payment.
- Return concise actionable content.`;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post("/api/ask", async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: "Gemini API key is not configured. Add GEMINI_API_KEY to the server .env file." });
  }
  const question = String(req.body?.question || "").trim();
  const context = req.body?.context || {};
  if (question.length < 4) return res.status(400).json({ error: "Please enter a specific question for ASCIA." });
  if (question.length > 6000) return res.status(400).json({ error: "Please keep the question under 6,000 characters." });
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are ASCIA, an aerospace and space supply-chain intelligence agent for an India-first startup serving buyers, suppliers, manufacturers, and logistics partners globally. Answer the user's question using current web information and cite sources via the platform's AI Analyzer. Cover aircraft/aviation, satellite/spacecraft, launch vehicles, space electronics, ground systems, materials and precision parts when relevant.

Be practical and structured. Address product/part specifics, buyer/supplier/manufacturer discovery, price/cost drivers (never invent a live quote), company onboarding/KYC, supplier qualification, order-to-delivery tracking, quality before dispatch, payments/fraud, shipping/customs, standards, India government support, startup steps, and risks as relevant to the question. Explain the difference between ISO 9001 (quality management systems) and AS9100 (aviation, space and defence aerospace quality management requirements); do not call it “AS9001.” Tailor applicability to the component, intended use, customer contract, countries and export-control classification. Do not imply all standards apply to all parts. For India, consider MCA/company registration, GST/IEC where relevant, DGFT/SCOMET, customs, IN-SPACe/Indian Space Policy, and other official programmes only where applicable. Separate confirmed facts, practical guidance and assumptions. Prefer official regulators, standards bodies and government pages; cite the source name and URL in the answer where possible. Never fabricate supplier rankings, prices, certificates, company registration status, stock availability, sanctions checks, legal consequences or source links. If current supplier or price data cannot be verified, say so and explain how to validate it. State that the agent is decision support, not legal, export classification, engineering, airworthiness or quality-release approval. For critical parts, require qualified human review.

User question:
${question}

Optional component/order context:
${JSON.stringify(context, null, 2)}

IMPORTANT OUTPUT FORMAT: The answer is displayed in a web dashboard, so make it scan-friendly rather than an essay. Use this exact structure, adapting only where relevant:
## Quick answer
Give a direct answer in 2–4 short sentences.
## Key findings
Use 3–6 concise bullets.
## Details
Use short sections with descriptive headings. Use a Markdown table when comparing standards, supplier options, cost factors, responsibilities, or consequences. Keep each cell brief.
## Risks and controls
Use a table with Risk | Why it matters | Recommended control. Prioritize the top risks; avoid repeating the same point.
## Recommended next steps
Give 3–5 numbered, actionable steps.
## Sources
List the most relevant official/current sources as Markdown links when available. Do not invent URLs.
## Important limitations
State what needs confirmation by a qualified professional.
Keep the whole answer to roughly 500–800 words unless the user explicitly asks for a comprehensive report. Define technical acronyms on first use. Avoid long paragraphs (maximum 3 sentences each), giant unbroken lists, repeated disclaimers, and raw Markdown syntax shown as text. If the user asks a broad question, summarize first and organize deeper detail into tables and short sections. Never sacrifice correctness for brevity.`;
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.2 }
    });
    const answer = response.text || "No answer was returned. Please try again.";
    const candidate = response.candidates?.[0] || {};
    const metadata = candidate.groundingMetadata || candidate.grounding_metadata || {};
    const chunks = metadata.groundingChunks || metadata.grounding_chunks || [];
    const sources = chunks.map(chunk => {
      const web = chunk.web || chunk.webSource || chunk.web_source || {};
      return { title: web.title || web.uri || web.url || "Web source", url: web.uri || web.url || "" };
    }).filter(source => source.url && /^https?:\/\//i.test(source.url));
    const uniqueSources = [...new Map(sources.map(source => [source.url, source])).values()].slice(0, 12);
    res.json({ answer, sources: uniqueSources, model: MODEL, generatedAt: new Date().toISOString(), liveWebResearch: true, searchQueries: metadata.webSearchQueries || metadata.web_search_queries || [] });
  } catch (error) {
    console.error("ASCIA question failed:", error?.message || error);
    res.status(502).json({ error: "ASCIA could not complete the grounded answer. Check the model, API key, internet access and Gemini quota, then retry." });
  }
});

app.post("/api/analyze", async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: "Gemini API key is not configured. Copy .env.example to .env and add GEMINI_API_KEY on the server." });
  }
  const input = req.body || {};
  if (!String(input.part || "").trim()) {
    return res.status(400).json({ error: "Please enter a component name." });
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(input),
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    const raw = response.text || "";
    let report;
    try {
      report = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      report = JSON.parse(cleaned);
    }
    res.json({ report, model: MODEL, generatedAt: new Date().toISOString(), liveWebResearch: false });
  } catch (error) {
    console.error("Gemini analysis failed:", error?.message || error);
    res.status(502).json({ error: "The Gemini analysis failed. Check the server log, model availability, API key and quota, then retry." });
  }
});

app.listen(PORT, () => {
  console.log(`ASCIA API listening on http://localhost:${PORT}`);
  console.log(`Gemini model: ${MODEL}`);
});