import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const { prompt, existingCode } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    let fullPrompt;
    if (existingCode) {
      fullPrompt = `Update this React component based on the user's request: "${prompt}"

Current code:
\`\`\`jsx
${existingCode}
\`\`\`

Please provide the updated component code. Make sure to:
1. Keep the same component structure and props
2. IMPORTANT: Do NOT use import statements. React hooks (useState, useEffect, etc.) and Icons (from Lucide) are already available in scope
3. IMPORTANT: Do NOT use TypeScript syntax like type annotations (:type) or interfaces - use plain JavaScript
4. Use Tailwind CSS for styling
5. Make the component self-contained and functional
6. End your code with "return ComponentName;" where ComponentName is your component function
7. Only return the JSX code, no explanations

Updated component:`;
    } else {
      fullPrompt = `Create a React component for: "${prompt}"

Please create a complete, functional React component that:
1. Uses plain JavaScript (no TypeScript syntax or type annotations)
2. Uses Tailwind CSS for styling
3. Is interactive and engaging
4. Uses React hooks when appropriate (useState, useEffect, useCallback, useMemo, useRef)
5. Is self-contained and doesn't require external dependencies beyond React
6. IMPORTANT: Do NOT use import statements. React hooks (useState, useEffect, etc.) and Icons (from Lucide) are already available in scope
7. IMPORTANT: Do NOT use TypeScript syntax like type annotations (:type) or interfaces
8. End your code with "return ComponentName;" where ComponentName is your component function
9. Only return the JSX code, no explanations

Example format:
const MyComponent = ({ title, initialCount }) => {
  const [count, setCount] = useState(initialCount || 0);
  // ... component logic
  return <div>...</div>;
};

return MyComponent;

Component code:`;
    }

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    let code = response.text();

    // Clean up the response to extract just the code
    code = code.replace(/```tsx?/g, '').replace(/```jsx?/g, '').replace(/```/g, '').trim();

    // Remove any import statements that might have been generated
    code = code.replace(/^import.*?;\n/gm, '').trim();

    // Remove TypeScript syntax that might have been generated
    // Remove type annotations from function parameters like `: string` or `: number`
    code = code.replace(/:\s*\w+(\[\])?\s*(?=[,)}>])/g, '');
    // Remove interface declarations
    code = code.replace(/^interface\s+\w+\s*{[^}]*}$/gm, '').trim();
    // Remove type annotations from variables like `const x: string =`
    code = code.replace(/:\s*\w+(\[\])?\s*(?==)/g, '');

    res.status(200).json({ code });
  } catch (error) {
    console.error('Error generating widget:', error);
    res.status(500).json({
      error: 'Failed to generate widget',
      details: error.message
    });
  }
}