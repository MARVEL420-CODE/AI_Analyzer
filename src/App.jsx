import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, ArrowDownRight, ArrowRight, BadgeCheck, Boxes, BrainCircuit, Check,
  ChevronDown, CircleAlert, ClipboardCheck, Clock3, FileSearch, FileText,
  Globe2, LockKeyhole, Orbit, Plane, Rocket, Search, ShieldAlert, ShieldCheck,
  Sparkles, Truck, WalletCards, Workflow, X, MessageSquareText, Send, ExternalLink, BookOpen
} from "lucide-react";

const families = [
  { value: "satellite", label: "Satellite / spacecraft", icon: Orbit },
  { value: "aircraft", label: "Aircraft / engine", icon: Plane },
  { value: "launch", label: "Launch vehicle / propulsion", icon: Rocket },
  { value: "electronics", label: "Space electronics", icon: BrainCircuit },
  { value: "ground", label: "Ground systems", icon: Activity },
  { value: "materials", label: "Materials / machined parts", icon: Boxes }
];

const initial = {
  part: "Satellite flight computer",
  category: "electronics",
  partNumber: "",
  material: "",
  criticality: "High / mission critical",
  intendedUse: "Commercial low Earth orbit communications satellite",
  origin: "India",
  destination: "Germany",
  supplier: "",
  orderValue: "",
  currency: "INR",
  paymentTerms: "Not decided",
  requirements: ""
};

const defaultReport = {
  executiveSummary: "Run an analysis to create a part-specific report. This workspace will identify risks, evidence gaps, checks and human approval gates.",
  decision: "Preliminary review required",
  confidence: "Low",
  riskScore: null,
  keyUnknowns: ["Exact part number and revision", "Supplier identity and qualification evidence", "Applicable mission and export-control requirements"],
  risks: [],
  compliance: [],
  qualityChecklist: [],
  supplierChecks: [],
  paymentControls: [],
  logisticsChecks: [],
  workflow: [],
  futureScenarios: [],
  nextActions: ["Complete the component details", "Run the Gemini analysis", "Verify material findings against official sources"],
  disclaimer: "AI-generated decision support only. Not a legal opinion, export-control determination, engineering approval, airworthiness finding or quality release."
};

const tabs = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "risks", label: "Risk register", icon: ShieldAlert },
  { id: "compliance", label: "Compliance", icon: BadgeCheck },
  { id: "workflow", label: "Workflow", icon: Workflow },
  { id: "actions", label: "Action plan", icon: ClipboardCheck }
];

function severityClass(value = "") {
  const s = value.toLowerCase();
  if (s.includes("critical")) return "critical";
  if (s.includes("high")) return "high";
  if (s.includes("moderate") || s.includes("medium")) return "moderate";
  return "low";
}
function safeArray(value) { return Array.isArray(value) ? value : []; }

function App() {
  const [form, setForm] = useState(initial);
  const [report, setReport] = useState(defaultReport);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [copied, setCopied] = useState(false);
  const [question, setQuestion] = useState("What are the key India and international compliance requirements for a startup sourcing satellite electronics?");
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState("");
  const [answer, setAnswer] = useState(null);
  const [askMeta, setAskMeta] = useState(null);
  const suggestedQuestions = [
    "How do I verify an aerospace supplier in India?",
    "What does AS9100 mean, and when is it needed?",
    "How should I inspect a satellite component before dispatch?",
    "What payment fraud risks should a new aerospace marketplace control?"
  ];

  const riskCounts = useMemo(() => {
    const risks = safeArray(report.risks);
    return {
      critical: risks.filter(r => r.severity?.toLowerCase() === "critical").length,
      high: risks.filter(r => r.severity?.toLowerCase() === "high").length,
      total: risks.length
    };
  }, [report]);

  function update(key, value) { setForm(prev => ({ ...prev, [key]: value })); }

  async function analyze(event) {
    event?.preventDefault();
    if (!form.part.trim()) { setError("Enter a component name first."); return; }
    setLoading(true); setError(""); setActiveTab("overview");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Analysis request failed.");
      setReport({ ...defaultReport, ...payload.report });
      setMeta({ model: payload.model, generatedAt: payload.generatedAt, liveWebResearch: payload.liveWebResearch });
    } catch (e) {
      setError(e.message || "Unable to connect to the agent. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function askASCIA(event, preset) {
    event?.preventDefault();
    const prompt = (preset || question).trim();
    if (prompt.length < 4) { setAskError("Enter a specific question first."); return; }
    setQuestion(prompt); setAskLoading(true); setAskError("");
    try {
      const response = await fetch("/api/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, context: { component: form.part, family: form.category, partNumber: form.partNumber, intendedUse: form.intendedUse, origin: form.origin, destination: form.destination, supplier: form.supplier, orderValue: form.orderValue, currency: form.currency, paymentTerms: form.paymentTerms } })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Question request failed.");
      setAnswer(payload.answer); setAskMeta(payload); 
    } catch (e) { setAskError(e.message || "Unable to connect to the research agent."); }
    finally { setAskLoading(false); }
  }

  function downloadReport() {
    const text = [
      "ASCIA — AEROSPACE & SPACE SUPPLY CHAIN INTELLIGENCE",
      `Component: ${form.part}`,
      `Family: ${families.find(f => f.value === form.category)?.label || form.category}`,
      `Generated: ${meta?.generatedAt || "Not generated"}`,
      `Decision: ${report.decision}`,
      `Preliminary risk score: ${report.riskScore ?? "Not scored"}`,
      "",
      "EXECUTIVE SUMMARY", report.executiveSummary || "",
      "",
      "RISKS", ...safeArray(report.risks).map(r => `[${r.severity}] ${r.title}\n${r.whyItMatters}\nMitigation: ${r.mitigation}`),
      "",
      "COMPLIANCE", ...safeArray(report.compliance).map(c => `${c.area}: ${c.requirement}\nStatus: ${c.status}\nSource: ${c.sourceName || ""} ${c.sourceUrl || ""}`),
      "",
      "QUALITY CHECKLIST", ...safeArray(report.qualityChecklist).map((x, i) => `${i + 1}. ${x}`),
      "",
      "SUPPLIER CHECKS", ...safeArray(report.supplierChecks).map((x, i) => `${i + 1}. ${x}`),
      "",
      "PAYMENT CONTROLS", ...safeArray(report.paymentControls).map((x, i) => `${i + 1}. ${x}`),
      "",
      "LOGISTICS CHECKS", ...safeArray(report.logisticsChecks).map((x, i) => `${i + 1}. ${x}`),
      "",
      "WORKFLOW", ...safeArray(report.workflow).map((x, i) => `${i + 1}. ${x.name}: ${x.detail}`),
      "",
      "NEXT ACTIONS", ...safeArray(report.nextActions).map((x, i) => `${i + 1}. ${x}`),
      "",
      "DISCLAIMER", report.disclaimer || defaultReport.disclaimer
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "ascia-component-analysis.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(`${form.part}\n${report.executiveSummary}\nDecision: ${report.decision}\nNext actions:\n${safeArray(report.nextActions).map(x => `- ${x}`).join("\n")}`);
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch { setError("Clipboard access was blocked by your browser."); }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" /><div className="ambient ambient-b" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ASCIA home">
          <div className="brand-mark"><Orbit size={23} strokeWidth={1.8}/></div>
          <div><strong>ASCIA</strong><span>SUPPLY CHAIN INTELLIGENCE</span></div>
        </a>
        <div className="topbar-right">
          <span className="status-dot" /> <span className="connected-label">Decision-support workspace</span>
          <div className="avatar">AI</div>
        </div>
      </header>

      <main id="top" className="main-wrap">
        <motion.section className="hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14}/> INTELLIGENCE ENGINE <span>•</span> MVP 0.2</div>
            <h1>Know your part.<br/><em>Control your risk.</em></h1>
            <p>Turn aerospace and space component enquiries into evidence-aware risk assessments, compliance research plans and procurement workflows.</p>
            <div className="hero-chips"><span><Plane size={13}/> Aviation</span><span><Orbit size={13}/> Space systems</span><span><Globe2 size={13}/> India → Global</span></div>
          </div>
          <div className="orbit-visual" aria-hidden="true">
            <motion.div className="orbit-ring ring-one" animate={{ rotate: 360 }} transition={{ duration: 38, repeat: Infinity, ease: "linear" }}/>
            <motion.div className="orbit-ring ring-two" animate={{ rotate: -360 }} transition={{ duration: 52, repeat: Infinity, ease: "linear" }}/>
            <motion.div className="orbit-core" animate={{ scale: [1, 1.045, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}><Orbit size={42}/></motion.div>
            <span className="orbit-node node-a"><ShieldCheck size={17}/></span><span className="orbit-node node-b"><Boxes size={17}/></span><span className="orbit-node node-c"><Globe2 size={17}/></span>
            <div className="orbit-caption"><span>ANALYZE</span><span>VERIFY</span><span>DECIDE</span></div>
          </div>
        </motion.section>

        <motion.section className="ask-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}>
          <div className="ask-head">
            <div className="ask-icon"><MessageSquareText size={21}/></div>
            <div className="ask-title"><span className="section-kicker">LIVE RESEARCH AGENT</span><h2>Ask ASCIA anything</h2><p>Research aerospace and satellite supply chains with current web sources, practical next steps and citations.</p></div>
            <div className="grounded-pill"><span className="status-dot"/> AI Analyzer</div>
          </div>
          <form className="ask-form" onSubmit={askASCIA}>
            <textarea aria-label="Ask ASCIA a question" value={question} onChange={e => setQuestion(e.target.value)} rows="3" placeholder="Ask about supplier verification, AS9100, quality inspection, India regulations, pricing, payments, logistics…"/>
            <button className="ask-button" type="submit" disabled={askLoading}>{askLoading ? <><span className="spinner"/> Researching sources…</> : <><Send size={15}/> Ask agent <ArrowRight size={15}/></>}</button>
          </form>
          <div className="suggestion-row">{suggestedQuestions.map((q, i) => <button key={q} type="button" onClick={e => askASCIA(e, q)} disabled={askLoading}>{q}</button>)}</div>
          {askError && <div className="error-box"><CircleAlert size={16}/><span>{askError}</span><button type="button" onClick={() => setAskError("")} aria-label="Dismiss error"><X size={14}/></button></div>}
          <AnimatePresence>{askLoading && <motion.div className="research-progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><span/><span/><span/> Checking current web sources and assembling an evidence-aware answer…</motion.div>}</AnimatePresence>
          {answer && <motion.div className="answer-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="answer-top"><div><span className="ai-label"><Sparkles size={12}/> GROUNDED ANSWER</span><p>Generated {askMeta?.generatedAt ? new Date(askMeta.generatedAt).toLocaleString() : "just now"} · {askMeta?.model || "Gemini"}</p></div><span className="source-count"><BookOpen size={13}/> {askMeta?.sources?.length || 0} sources</span></div>
            <div className="answer-body markdown-answer"><ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown></div>
            {askMeta?.sources?.length > 0 && <div className="answer-sources"><h3><Globe2 size={15}/> Sources to inspect</h3><div className="source-grid">{askMeta.sources.map((source, i) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{String(i + 1).padStart(2, "0")}</span><div><strong>{source.title}</strong><small>{new URL(source.url).hostname}</small></div><ExternalLink size={13}/></a>)}</div></div>}
            <p className="answer-caveat">Verify legal applicability, standard revisions, supplier claims, live price/stock and export-control requirements before acting. Search citations are research leads, not certification or approval.</p>
          </motion.div>}
        </motion.section>

        <section className="metric-strip">
          {[
            { label: "Component profile", value: form.part ? "Ready to assess" : "Awaiting input", icon: Boxes, tint: "blue" },
            { label: "Risk signals", value: report.risks.length ? `${riskCounts.total} identified` : "Not assessed", icon: ShieldAlert, tint: "orange" },
            { label: "Critical flags", value: report.risks.length ? String(riskCounts.critical) : "—", icon: CircleAlert, tint: "red" },
            { label: "Evidence status", value: meta ? "AI report · unverified sources" : "Awaiting analysis", icon: FileSearch, tint: "green" }
          ].map((m, i) => <motion.div className="metric-card" key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 * i }}>
            <div className={`metric-icon ${m.tint}`}><m.icon size={17}/></div><span>{m.label}</span><strong>{m.value}</strong>
          </motion.div>)}
        </section>

        <div className="workspace">
          <motion.aside className={`input-panel ${showForm ? "" : "collapsed"}`} layout>
            <button className="panel-heading" type="button" onClick={() => setShowForm(!showForm)}>
              <span><span className="section-kicker">01 / INPUT</span><strong>Component profile</strong></span><ChevronDown size={18} className={showForm ? "" : "rotate"}/>
            </button>
            <AnimatePresence initial={false}>
              {showForm && <motion.form className="component-form" onSubmit={analyze} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .24 }}>
                <label>Component name <span className="required">*</span></label>
                <input value={form.part} onChange={e => update("part", e.target.value)} placeholder="e.g. satellite flight computer" required/>
                <label>Product family</label>
                <div className="family-grid">
                  {families.map(f => <button type="button" key={f.value} className={`family-option ${form.category === f.value ? "selected" : ""}`} onClick={() => update("category", f.value)}><f.icon size={16}/><span>{f.label}</span></button>)}
                </div>
                <div className="field-row">
                  <div><label>Part number</label><input value={form.partNumber} onChange={e => update("partNumber", e.target.value)} placeholder="Optional"/></div>
                  <div><label>Material / spec</label><input value={form.material} onChange={e => update("material", e.target.value)} placeholder="e.g. Ti-6Al-4V"/></div>
                </div>
                <label>Mission criticality</label>
                <select value={form.criticality} onChange={e => update("criticality", e.target.value)}>
                  <option>Not yet determined</option><option>Non-critical / ground use</option><option>High / mission critical</option>
                </select>
                <label>Intended use / mission</label>
                <textarea rows="2" value={form.intendedUse} onChange={e => update("intendedUse", e.target.value)} placeholder="Mission, subsystem, environment…"/>
                <div className="field-row">
                  <div><label>Supplier country</label><input value={form.origin} onChange={e => update("origin", e.target.value)} placeholder="India"/></div>
                  <div><label>Destination country</label><input value={form.destination} onChange={e => update("destination", e.target.value)} placeholder="Germany"/></div>
                </div>
                <label>Supplier / official website</label>
                <input value={form.supplier} onChange={e => update("supplier", e.target.value)} placeholder="Optional — not automatically verified"/>
                <div className="field-row">
                  <div><label>Order value</label><input type="number" min="0" value={form.orderValue} onChange={e => update("orderValue", e.target.value)} placeholder="Optional"/></div>
                  <div><label>Currency</label><select value={form.currency} onChange={e => update("currency", e.target.value)}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></div>
                </div>
                <label>Payment terms</label>
                <select value={form.paymentTerms} onChange={e => update("paymentTerms", e.target.value)}><option>Not decided</option><option>Full / large advance</option><option>Milestone payments</option><option>Letter of credit / bank instrument</option><option>Payment after acceptance / net terms</option></select>
                <label>Technical / contract notes</label>
                <textarea rows="3" value={form.requirements} onChange={e => update("requirements", e.target.value)} placeholder="Drawing revision, quantity, customer standard, deadline, certificate details…"/>
                {error && <div className="error-box"><CircleAlert size={16}/><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={14}/></button></div>}
                <button className="analyze-button" type="submit" disabled={loading}>{loading ? <><span className="spinner"/> Analyzing component…</> : <><Sparkles size={16}/> Run AI analysis <ArrowRight size={16}/></>}</button>
                <p className="privacy-note"><LockKeyhole size={13}/> API key stays on your backend. Avoid submitting controlled technical data until your data-handling policy is approved.</p>
              </motion.form>}
            </AnimatePresence>
          </motion.aside>

          <section className="report-panel">
            <div className="report-top">
              <div><span className="section-kicker">02 / INTELLIGENCE REPORT</span><h2>{meta ? "Analysis complete" : "Component risk overview"}</h2><p>{meta ? `Generated with ${meta.model} · ${new Date(meta.generatedAt).toLocaleString()}` : "Run an analysis to generate a part-specific report."}</p></div>
              <div className={`decision-badge ${meta ? "ready" : ""}`}><span/>{meta ? report.decision || "Review required" : "Awaiting input"}</div>
            </div>
            <nav className="tabbar" aria-label="Report sections">
              {tabs.map(t => <button key={t.id} className={activeTab === t.id ? "active" : ""} onClick={() => setActiveTab(t.id)}><t.icon size={15}/><span>{t.label}</span></button>)}
            </nav>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab + (meta ? "report" : "empty")} className="tab-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .2 }}>
                {activeTab === "overview" && <Overview report={report} meta={meta} form={form} riskCounts={riskCounts} />}
                {activeTab === "risks" && <Risks report={report}/>}
                {activeTab === "compliance" && <Compliance report={report}/>}
                {activeTab === "workflow" && <WorkflowPanel report={report}/>}
                {activeTab === "actions" && <Actions report={report}/>}
              </motion.div>
            </AnimatePresence>
            <div className="report-footer">
              <span><LockKeyhole size={13}/> Decision support only · human approval required</span>
              <div><button className="text-button" onClick={copySummary}><FileText size={14}/>{copied ? "Copied" : "Copy summary"}</button><button className="text-button" onClick={downloadReport}><ArrowDownRight size={14}/> Export report</button></div>
            </div>
          </section>
        </div>
        <footer className="app-footer"><div className="brand-mini"><Orbit size={17}/> ASCIA <span>BUILDING TRUST INTO EVERY COMPONENT</span></div><p>AI-generated findings must be checked against current authoritative sources. No supplier, component, licence or quality status is verified by this interface alone.</p></footer>
      </main>
    </div>
  );
}

function Overview({ report, meta, form, riskCounts }) {
  return <div className="overview-stack">
    <div className="summary-card">
      <div className="summary-top"><div className="summary-icon"><BrainCircuit size={20}/></div><span className="ai-label"><Sparkles size={12}/> AI EXECUTIVE SUMMARY</span><span className="confidence">Confidence: {report.confidence || "Low"}</span></div>
      <h3>{form.part || "Component assessment"}</h3><p>{report.executiveSummary}</p>
      {report.riskScore !== null && report.riskScore !== undefined && <div className="risk-meter"><div className="meter-label"><span>Preliminary risk index</span><strong>{report.riskScore}/100</strong></div><div className="meter-track"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, Number(report.riskScore) || 0))}%` }} transition={{ duration: .8 }} /></div><small>AI prioritization estimate, not a probability of failure.</small></div>}
    </div>
    <div className="mini-stats">
      <div><span>Risk items</span><strong>{report.risks.length || "—"}</strong><small>{riskCounts.critical} critical flags</small></div>
      <div><span>Compliance checks</span><strong>{report.compliance.length || "—"}</strong><small>Applicability requires review</small></div>
      <div><span>Next actions</span><strong>{report.nextActions.length || "—"}</strong><small>Prioritized follow-ups</small></div>
    </div>
    <div className="content-card"><SectionTitle icon={CircleAlert} title="Key unknowns to resolve"/><BulletList items={report.keyUnknowns} empty="No unknowns were returned."/></div>
    <div className="content-card"><SectionTitle icon={ArrowRight} title="Recommended next steps"/><NumberList items={report.nextActions} empty="Run an analysis to generate next steps."/></div>
    {meta && <div className="source-note"><Globe2 size={15}/><span>The question agent can use AI Analyzer. Treat citations as research leads and verify regulatory applicability independently.</span></div>}
    <p className="disclaimer">{report.disclaimer || defaultReport.disclaimer}</p>
  </div>;
}

function SectionTitle({ icon: Icon, title }) { return <h3 className="section-title"><span><Icon size={16}/></span>{title}</h3>; }
function BulletList({ items, empty }) { return items?.length ? <ul className="bullet-list">{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="empty-copy">{empty}</p>; }
function NumberList({ items, empty }) { return items?.length ? <ol className="number-list">{items.map((x, i) => <li key={i}><span>{String(i + 1).padStart(2, "0")}</span>{x}</li>)}</ol> : <p className="empty-copy">{empty}</p>; }

function Risks({ report }) {
  return <div className="tab-stack"><div className="section-intro"><h3>Risk register</h3><p>Each risk should be tied to evidence, an owner and a mitigation plan before it is used to approve a transaction.</p></div>
    {report.risks?.length ? report.risks.map((r, i) => <motion.article className="risk-card" key={r.title + i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * .04, .25) }}>
      <div className="risk-card-head"><div><span className="risk-index">RISK {String(i + 1).padStart(2, "0")}</span><h4>{r.title}</h4></div><span className={`severity ${severityClass(r.severity)}`}>{r.severity || "Review"}</span></div>
      <p>{r.whyItMatters}</p><div className="mitigation"><ShieldCheck size={15}/><div><strong>Mitigation</strong><span>{r.mitigation}</span></div></div>
      <div className="risk-meta"><span>Likelihood: {r.likelihood || "Unknown"}</span><span>Impact: {r.impact || "Unknown"}</span></div>
      {r.evidenceNeeded?.length > 0 && <details><summary>Evidence to collect</summary><BulletList items={r.evidenceNeeded}/></details>}
    </motion.article>) : <EmptyState icon={ShieldAlert} title="No risk register yet" detail="Run the Gemini analysis to identify component-specific risks."/>}
  </div>;
}

function Compliance({ report }) {
  return <div className="tab-stack"><div className="section-intro"><h3>Compliance & standards</h3><p>Applicability depends on the part, mission, customer contract, origin, destination, end use and current rules.</p></div>
    {report.compliance?.length ? report.compliance.map((c, i) => <article className="compliance-row" key={c.area + i}>
      <div className="compliance-symbol"><BadgeCheck size={18}/></div><div className="compliance-main"><div className="compliance-head"><h4>{c.area}</h4><span className={`severity ${severityClass(c.status)}`}>{c.status || "Needs review"}</span></div><p>{c.requirement}</p><small>{c.whyRelevant}</small>
        {c.sourceName && <div className="source-link"><Globe2 size={13}/>{c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noreferrer">{c.sourceName} <ArrowRight size={12}/></a> : <span>{c.sourceName} · URL not supplied</span>}</div>}
      </div>
    </article>) : <EmptyState icon={BadgeCheck} title="No compliance matrix yet" detail="Run an analysis. Current rules and source links still require independent verification."/>}
    <div className="content-card"><SectionTitle icon={ClipboardCheck} title="Quality checklist"/><BulletList items={report.qualityChecklist} empty="No quality checklist yet."/></div>
  </div>;
}

function WorkflowPanel({ report }) {
  const workflow = safeArray(report.workflow);
  return <div className="tab-stack"><div className="section-intro"><h3>Procure-to-delivery workflow</h3><p>Use this as a process map. Gates marked by the model must be reviewed against actual contract and regulatory requirements.</p></div>
    {workflow.length ? <div className="workflow-list">{workflow.map((w, i) => <motion.div className="workflow-step" key={w.name + i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }}>
      <div className="step-rail"><span>{String(i + 1).padStart(2, "0")}</span>{i < workflow.length - 1 && <i/>}</div><div className="step-card"><div className="step-title">{w.name}<span className={w.gate ? "gate-label" : "step-label"}>{w.gate ? "REVIEW GATE" : "PROCESS"}</span></div><p>{w.detail}</p></div>
    </motion.div>)}</div> : <EmptyState icon={Workflow} title="Workflow not generated" detail="Run an analysis to create the part-specific order workflow."/>}
    <div className="content-card"><SectionTitle icon={Truck} title="Logistics checks"/><BulletList items={report.logisticsChecks} empty="No logistics checks yet."/></div>
  </div>;
}

function Actions({ report }) {
  return <div className="tab-stack"><div className="section-intro"><h3>Recommended action plan</h3><p>Close evidence gaps in order of consequence. Assign an accountable owner and due date before procurement moves forward.</p></div>
    <div className="content-card"><SectionTitle icon={Search} title="Supplier verification"/><BulletList items={report.supplierChecks} empty="No supplier checks yet."/></div>
    <div className="content-card"><SectionTitle icon={WalletCards} title="Payment safeguards"/><BulletList items={report.paymentControls} empty="No payment controls yet."/></div>
    <div className="content-card"><SectionTitle icon={Clock3} title="Future scenarios"/>{report.futureScenarios?.length ? report.futureScenarios.map((s, i) => <div className="scenario" key={s.horizon + i}><span>{s.horizon}</span><h4>{s.scenario}</h4><p>{s.response}</p>{s.watchSignals?.length > 0 && <details><summary>Signals to monitor</summary><BulletList items={s.watchSignals}/></details>}</div>) : <p className="empty-copy">No future scenarios returned.</p>}</div>
    <div className="content-card"><SectionTitle icon={Check} title="Next actions"/><NumberList items={report.nextActions} empty="Run an analysis to generate an action plan."/></div>
  </div>;
}

function EmptyState({ icon: Icon, title, detail }) { return <div className="empty-state"><div><Icon size={22}/></div><h4>{title}</h4><p>{detail}</p></div>; }

export default App;