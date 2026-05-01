import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const DEFAULT_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const DEMO_INPUT =
  "sinusitis - congestion 10d, facial pressure, no sob, start augmentin, flonase, fluids\nhtn - home bp 150s, missed meds, restart amlo, bmp, f/u 2w\nback pain - lifted box, no weakness numbness bowel bladder, nsaid, pt";

type ProblemDraft = {
  problem: string;
  bullets: string[];
};

type Boilerplate = {
  id: string;
  label: string;
  text: string;
  patterns: RegExp[];
};

type ModelStatus = "idle" | "loading" | "ready" | "unavailable" | "generating";

type WebLlmEngine = {
  chat: {
    completions: {
      create: (request: {
        messages: Array<{ role: "system" | "user"; content: string }>;
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: "json_object" };
      }) => Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
    };
  };
};

const boilerplates: Boilerplate[] = [
  {
    id: "return-precautions",
    label: "Return precautions",
    text:
      "Return precautions reviewed, including worsening symptoms, new fever, chest pain, shortness of breath, dehydration, neurologic changes, or any other acute concern.",
    patterns: [
      /\b(uri|viral|sinus|sinusitis|bronchitis|cough|fever|flu|covid|gastroenteritis|vomiting|diarrhea|illness)\b/i
    ]
  },
  {
    id: "ed-precautions",
    label: "ED precautions",
    text:
      "Emergency precautions reviewed for red flag symptoms or rapid clinical worsening.",
    patterns: [/\b(chest pain|sob|dyspnea|syncope|weakness|neuro|stroke|severe pain|red flag)\b/i]
  },
  {
    id: "abx-risk",
    label: "Antibiotic counseling",
    text:
      "Medication risks and benefits discussed, including GI upset, allergy, rash, and the importance of completing therapy as prescribed.",
    patterns: [/\b(augmentin|amoxicillin|azithro|doxy|cephalexin|bactrim|antibiotic|abx)\b/i]
  },
  {
    id: "nsaid-risk",
    label: "NSAID counseling",
    text:
      "NSAID risks reviewed, including gastritis or bleeding, kidney injury, blood pressure elevation, and avoiding use with other NSAIDs.",
    patterns: [/\b(ibuprofen|naproxen|nsaid|meloxicam|diclofenac|advil|aleve)\b/i]
  },
  {
    id: "htn-risk",
    label: "Hypertension risk",
    text:
      "Reviewed long-term risks of uncontrolled hypertension, including cardiovascular, renal, and cerebrovascular complications.",
    patterns: [/\b(htn|hypertension|bp|blood pressure)\b/i]
  },
  {
    id: "diabetes-risk",
    label: "Diabetes risk",
    text:
      "Reviewed risks of uncontrolled diabetes and importance of medication adherence, nutrition, activity, and routine monitoring.",
    patterns: [/\b(dm|diabetes|a1c|glucose|metformin|insulin)\b/i]
  },
  {
    id: "back-pain-red-flags",
    label: "Back pain red flags",
    text:
      "Red flags reviewed, including progressive weakness, saddle anesthesia, bowel or bladder dysfunction, fever, trauma, or unrelenting night pain.",
    patterns: [/\b(back pain|sciatica|lumbar|radiculopathy|low back)\b/i]
  }
];

const systemPrompt = `You expand terse outpatient clinical shorthand into concise assessment and plan text.
Return strict JSON with this shape:
{"problems":[{"problem":"Problem name","bullets":["3 to 5 concise clinical shorthand bullets"]}]}
Rules:
- Preserve the clinician's intent. Do not invent diagnoses, exam findings, test results, or follow-up dates.
- Use professional outpatient assessment/plan language.
- Each bullet should be short, clinically useful, and action oriented.
- Do not include boilerplate counseling unless explicitly typed; the app adds keyword boilerplate later.
- Keep problem names brief and title case.`;

function App() {
  const [input, setInput] = useState(DEMO_INPUT);
  const [draft, setDraft] = useState<ProblemDraft[]>([]);
  const [manualNote, setManualNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [modelName, setModelName] = useState(DEFAULT_MODEL);
  const [progress, setProgress] = useState("");
  const [copyState, setCopyState] = useState("Copy");
  const [temperature, setTemperature] = useState(0.35);
  const [generationKey, setGenerationKey] = useState(0);
  const engineRef = useRef<WebLlmEngine | null>(null);

  const matches = useMemo(() => matchBoilerplate(input), [input]);
  const formattedText = useMemo(() => toPlainText(draft, matches), [draft, matches]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./public-sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      generateNote(input, temperature + generationKey * 0.03);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [input, generationKey]);

  useEffect(() => {
    if (!isEditing) setManualNote(formattedText);
  }, [formattedText, isEditing]);

  async function loadModel() {
    if (engineRef.current || modelStatus === "loading") return;
    setModelStatus("loading");
    setProgress("Preparing local model");

    try {
      const webllm = await import("@mlc-ai/web-llm");
      const engine = await webllm.CreateMLCEngine(modelName, {
        initProgressCallback: (report: { text?: string; progress?: number }) => {
          const pct =
            typeof report.progress === "number" ? ` ${Math.round(report.progress * 100)}%` : "";
          setProgress(`${report.text ?? "Loading model"}${pct}`);
        }
      });
      engineRef.current = engine as WebLlmEngine;
      setModelStatus("ready");
      setProgress("Local model ready");
      await generateNote(input, temperature, engine as WebLlmEngine);
    } catch (error) {
      console.warn(error);
      setModelStatus("unavailable");
      setProgress("Using deterministic local formatter");
      setDraft(fallbackExpand(input));
    }
  }

  async function generateNote(text: string, temp: number, engine = engineRef.current) {
    if (!text.trim()) {
      setDraft([]);
      return;
    }

    if (!engine) {
      setDraft(fallbackExpand(text));
      return;
    }

    setModelStatus("generating");
    try {
      const response = await engine.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: Math.min(0.9, temp),
        max_tokens: 700,
        response_format: { type: "json_object" }
      });
      const content = response.choices?.[0]?.message?.content ?? "";
      const parsed = parseModelJson(content);
      setDraft(parsed.length ? parsed : fallbackExpand(text));
      setModelStatus("ready");
    } catch (error) {
      console.warn(error);
      setDraft(fallbackExpand(text));
      setModelStatus("unavailable");
      setProgress("Model call failed; local formatter active");
    }
  }

  async function copyNote() {
    const value = isEditing ? manualNote : formattedText;
    await navigator.clipboard.writeText(value);
    setCopyState("Copied");
    window.setTimeout(() => setCopyState("Copy"), 1400);
  }

  const statusText =
    modelStatus === "ready"
      ? "Ready"
      : modelStatus === "generating"
        ? "Generating"
        : modelStatus === "loading"
          ? "Loading"
          : modelStatus === "unavailable"
            ? "Fallback"
            : "Fallback";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Clinical Smart Phrase</p>
          <h1>Assessment / Plan Composer</h1>
        </div>
        <div className="model-strip" aria-live="polite">
          <span className={`status-dot ${modelStatus}`} />
          <span>{statusText}</span>
          <strong>{modelName}</strong>
        </div>
      </header>

      <section className="workspace" aria-label="Smart phrase workspace">
        <section className="pane input-pane">
          <div className="pane-header">
            <label htmlFor="clinical-input">Shorthand</label>
            <button type="button" onClick={() => setInput("")}>Clear</button>
          </div>
          <textarea
            id="clinical-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
          />
          <div className="controls">
            <button type="button" className="primary" onClick={loadModel}>
              {modelStatus === "loading" ? "Loading Model" : "Load Local Model"}
            </button>
            <button type="button" onClick={() => setGenerationKey((key) => key + 1)}>
              Regenerate
            </button>
            <label className="slider">
              Variation
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="boilerplate-bar" aria-label="Detected boilerplate">
            {matches.length ? (
              matches.map((match) => <span key={match.id}>{match.label}</span>)
            ) : (
              <span>No boilerplate matched</span>
            )}
          </div>
          <p className="progress" aria-live="polite">{progress}</p>
        </section>

        <section className="pane preview-pane">
          <div className="pane-header">
            <label htmlFor="manual-note">Formatted Note</label>
            <div className="actions">
              <button type="button" onClick={() => setIsEditing((editing) => !editing)}>
                {isEditing ? "Preview" : "Edit"}
              </button>
              <button type="button" className="primary" onClick={copyNote}>{copyState}</button>
            </div>
          </div>

          {isEditing ? (
            <textarea
              id="manual-note"
              className="manual-note"
              value={manualNote}
              onChange={(event) => setManualNote(event.target.value)}
              spellCheck={false}
            />
          ) : (
            <article className="note-preview">
              {draft.length ? (
                <>
                  {draft.map((problem, index) => (
                    <section className="problem" key={`${problem.problem}-${index}`}>
                      <h2>{problem.problem}</h2>
                      <ul>
                        {problem.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
                  {matches.length > 0 && (
                    <section className="boilerplate">
                      {matches.map((match) => (
                        <p key={match.id}>{match.text}</p>
                      ))}
                    </section>
                  )}
                </>
              ) : (
                <p className="empty-state">Start typing on the left.</p>
              )}
            </article>
          )}
        </section>
      </section>
    </main>
  );
}

function matchBoilerplate(text: string) {
  return boilerplates.filter((item) => item.patterns.some((pattern) => pattern.test(text)));
}

function parseModelJson(content: string): ProblemDraft[] {
  try {
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    const sliced = jsonStart >= 0 && jsonEnd >= 0 ? content.slice(jsonStart, jsonEnd + 1) : content;
    const parsed = JSON.parse(sliced) as { problems?: ProblemDraft[] };
    return sanitizeProblems(parsed.problems ?? []);
  } catch {
    return [];
  }
}

function sanitizeProblems(problems: ProblemDraft[]) {
  return problems
    .filter((problem) => problem.problem && Array.isArray(problem.bullets))
    .map((problem) => ({
      problem: titleCase(problem.problem.trim()),
      bullets: problem.bullets
        .map((bullet) => cleanBullet(String(bullet)))
        .filter(Boolean)
        .slice(0, 5)
    }))
    .filter((problem) => problem.bullets.length > 0);
}

function fallbackExpand(text: string): ProblemDraft[] {
  const chunks = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return chunks.map((line) => {
    const [rawName, rawDetails] = splitProblemLine(line);
    const details = rawDetails
      .split(/[,;]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    const bullets = details.length ? details.map(expandFragment) : [expandFragment(rawName)];
    return {
      problem: titleCase(rawName),
      bullets: bullets.slice(0, 5)
    };
  });
}

function splitProblemLine(line: string) {
  const separators = [" - ", ": ", " -- "];
  const separator = separators.find((value) => line.includes(value));
  if (!separator) {
    const [first, ...rest] = line.split(/\s+/);
    return [first ?? "Problem", rest.join(" ") || line];
  }
  const [name, ...rest] = line.split(separator);
  return [name || "Problem", rest.join(separator) || name];
}

function expandFragment(fragment: string) {
  const text = fragment.trim();
  const replacements: Array<[RegExp, string]> = [
    [/\bf\/u\b/gi, "follow up"],
    [/\bsob\b/gi, "shortness of breath"],
    [/\bcp\b/gi, "chest pain"],
    [/\bbp\b/gi, "blood pressure"],
    [/\bbmp\b/gi, "BMP"],
    [/\bpt\b/gi, "physical therapy"],
    [/\bnsaid\b/gi, "NSAID"],
    [/\babx\b/gi, "antibiotic"],
    [/\bamlo\b/gi, "amlodipine"],
    [/\bflonase\b/gi, "intranasal fluticasone"]
  ];

  const expanded = replacements.reduce((value, [pattern, replacement]) => {
    return value.replace(pattern, replacement);
  }, text);

  return cleanBullet(expanded.charAt(0).toUpperCase() + expanded.slice(1));
}

function cleanBullet(value: string) {
  return value.replace(/^[-*•\s]+/, "").replace(/\s+/g, " ").trim().replace(/\.$/, "");
}

function titleCase(value: string) {
  const known: Record<string, string> = {
    htn: "Hypertension",
    dm: "Diabetes",
    uri: "URI",
    copd: "COPD",
    gerd: "GERD"
  };
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (known[lower]) return known[lower];
  return trimmed
    .split(/\s+/)
    .map((word) => known[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toPlainText(draft: ProblemDraft[], matchedBoilerplate: Boilerplate[]) {
  const problemText = draft
    .map((problem) => {
      const bullets = problem.bullets.map((bullet) => `  - ${bullet}`).join("\n");
      return `${problem.problem}\n${bullets}`;
    })
    .join("\n\n");

  const boilerplateText = matchedBoilerplate.map((item) => `_${item.text}_`).join("\n");
  return [problemText, boilerplateText].filter(Boolean).join("\n\n");
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
