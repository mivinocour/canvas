import { GoogleGenerativeAI } from '@google/generative-ai';

// Models to try in order. The first one that returns a successful response wins.
// We list multiple to be resilient to model name changes / availability issues.
// Primary is the latest Gemini 3 Flash Preview; if it's unavailable for the
// project / region we automatically fall back to known-good models.
const MODEL_CANDIDATES = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
];

const SYSTEM_INSTRUCTION = `
You are an expert React Frontend Engineer. Your task is to generate functional React components based on user prompts.

**Runtime Environment:**
- The code is executed inside a browser sandbox where 'React', 'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo' and an 'Icons' object (from lucide-react) are already injected into scope.
- Tailwind CSS is available globally for styling.
- The code is transpiled with Babel (with the React JSX preset). Use plain JavaScript + JSX only.

**Output Rules (CRITICAL — follow exactly):**
1. Return ONLY raw JavaScript+JSX code. No markdown, no code fences, no commentary, no explanations.
2. DO NOT use 'import' or 'export' statements anywhere. All dependencies are pre-injected.
3. DO NOT use TypeScript syntax. NO type annotations (no ": string", no ": React.FC", no "<number>" generics, no "as" assertions, no "interface" / "type" declarations).
4. Use 'useState', 'useEffect', etc. directly (they are in scope). Do not destructure from React.
5. Use icons from the 'Icons' object (e.g. \`<Icons.Heart className="w-5 h-5" />\`). Never write \`import { Heart } from 'lucide-react'\`.
6. Define a single functional component and end the script with \`return ComponentName;\` (no semicolon-less, no default export).
7. The component must accept zero required props — it will be rendered as \`<Component />\`.
8. The root element should use \`w-full h-full\` so it fills the widget window.
9. Do NOT use external libraries, fetch(), localStorage, or any browser API beyond standard DOM/React.
10. Keep the code self-contained and runnable as-is.

**Design Philosophy — Minimal & Aesthetic:**
- Inspired by Notion / Linear — clean, calm, generous whitespace.
- Use slate/gray palette (bg-white, text-slate-700, border-slate-200). Add accent color only when it carries meaning.
- Rounded corners (rounded-lg / rounded-xl), subtle shadows (shadow-sm), small icons (w-4 h-4 / w-5 h-5).
- Buttons: \`bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-4 py-2 transition-colors\`.

**Example output (this is the EXACT format expected — no fences, no prose):**
const DateGenerator = () => {
  const ideas = ["Picnic in the park", "Try a new restaurant", "Movie night at home", "Weekend hiking"];
  const [idea, setIdea] = useState("");
  return (
    <div className="w-full h-full bg-white p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Icons.Heart className="w-5 h-5 text-slate-600" />
        <h2 className="text-lg font-medium text-slate-700">Date Ideas</h2>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-800 text-base mb-8 min-h-[48px] flex items-center justify-center px-4">
            {idea || "Generate a date idea to get started"}
          </div>
          <button
            onClick={() => setIdea(ideas[Math.floor(Math.random() * ideas.length)])}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
          >
            Generate Idea
          </button>
        </div>
      </div>
    </div>
  );
};
return DateGenerator;
`.trim();

/**
 * Aggressively clean a code blob returned by an LLM so that it is safe to
 * execute inside the Babel-standalone sandbox in DynamicWidget.tsx.
 */
function cleanCode(raw) {
  if (!raw) return '';
  let code = String(raw);

  // 1. Strip markdown code fences (```jsx, ```tsx, ```javascript, ```ts, plain ```)
  code = code.replace(/```(?:jsx|tsx|javascript|js|typescript|ts)?\s*\n?/gi, '');
  code = code.replace(/```/g, '');

  // 2. Remove ALL import statements (single-line and multi-line, with or without semicolon)
  //    Matches: import x from 'y';  /  import { a, b } from 'y'  /  import * as X from 'y'
  //    Including multi-line imports.
  code = code.replace(/^[ \t]*import\s+[^;]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '');
  code = code.replace(/^[ \t]*import\s+['"][^'"]+['"];?[ \t]*$/gm, '');
  // Multi-line variant (e.g. import {\n  a,\n  b\n} from 'x';)
  code = code.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?/g, '');
  code = code.replace(/import\s+\w+\s*,?\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?/g, '');

  // 3. Convert any `export default X` into `return X`
  code = code.replace(/export\s+default\s+/g, 'return ');
  // Strip stray named exports
  code = code.replace(/^[ \t]*export\s+(const|let|var|function)\s+/gm, '$1 ');

  // 4. Strip TypeScript artifacts that the AI sometimes leaves behind even when told not to.
  //    These are best-effort safety nets — the runtime ALSO has the typescript Babel preset
  //    enabled, but stripping here keeps error messages cleaner.
  code = code.replace(/^[ \t]*interface\s+\w+\s*\{[\s\S]*?\n\}\s*$/gm, '');
  code = code.replace(/^[ \t]*type\s+\w+\s*=\s*[^;\n]+;?\s*$/gm, '');

  // 5. Remove leading/trailing whitespace and any stray "Component code:" labels the model adds
  code = code.replace(/^\s*(component|widget|output|code)\s*:\s*$/gim, '');

  return code.trim();
}

function buildUpdatePrompt(instruction, existingCode) {
  return `Here is the existing widget code:

${existingCode}

The user wants to modify it with this instruction:
"${instruction}"

Rules:
1. Apply the change while preserving existing functionality unless asked otherwise.
2. Return the FULL updated component (not a diff).
3. Follow ALL output rules from the system instructions (no imports, no TypeScript, end with \`return ComponentName;\`).
4. Output raw JavaScript+JSX only — no markdown, no commentary.`;
}

async function generateWithFallback(genAI, userPrompt) {
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      });

      const result = await model.generateContent(userPrompt);
      const response = result.response;
      const text = response.text();

      if (text && text.trim().length > 0) {
        return { text, modelUsed: modelName };
      }
      lastError = new Error(`Model ${modelName} returned empty response`);
    } catch (err) {
      console.error(`Model ${modelName} failed:`, err?.message || err);
      lastError = err;
      // Try the next model
    }
  }

  throw lastError || new Error('All model candidates failed');
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, existingCode } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const userPrompt = existingCode
      ? buildUpdatePrompt(prompt, existingCode)
      : `Create a widget for: "${prompt}"`;

    const { text, modelUsed } = await generateWithFallback(genAI, userPrompt);

    let code = cleanCode(text);

    // Final safety: ensure the code ends with a `return` statement so the
    // sandbox can pick up the component. If the model forgot, try to recover
    // by detecting the last top-level component declaration.
    if (!/return\s+\w+\s*;?\s*$/.test(code)) {
      const componentMatch = code.match(/(?:const|function|let|var)\s+([A-Z]\w*)\s*[=(]/g);
      if (componentMatch && componentMatch.length > 0) {
        const last = componentMatch[componentMatch.length - 1];
        const nameMatch = last.match(/(?:const|function|let|var)\s+([A-Z]\w*)/);
        if (nameMatch) {
          code = `${code}\nreturn ${nameMatch[1]};`;
        }
      }
    }

    if (!code || code.length < 10) {
      return res.status(500).json({
        error: 'Generated code was empty after cleanup',
        details: 'The model returned content but it was not usable widget code.',
      });
    }

    return res.status(200).json({ code, model: modelUsed });
  } catch (error) {
    console.error('Error generating widget:', error);
    return res.status(500).json({
      error: 'Failed to generate widget',
      details: error?.message || String(error),
    });
  }
}
