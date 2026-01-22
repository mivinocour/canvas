import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `
You are an expert React Frontend Engineer. Your task is to generate functional React components based on user prompts.

**Runtime Environment:**
- The code will be executed in a browser environment with 'React', 'useState', 'useEffect', 'useRef', 'lucide-react' (as 'Icons') available in scope.
- Tailwind CSS is available for styling.

**Output Rules:**
1. Return **ONLY** the JavaScript code. Do not wrap in markdown code blocks (no \`\`\`jsx ... \`\`\`).
2. **DO NOT** use 'import' statements. All dependencies are pre-injected.
   - Use \`React.useState\` or just \`useState\` (it is in scope).
   - Use icons from the \`Icons\` object (e.g., \`Icons.Calendar\`, \`Icons.Heart\`, \`Icons.Plane\`).
3. Your code must define a functional component and **return it** at the end of the script.
   - Example pattern:
     \`\`\`javascript
     const MyWidget = () => {
       const [count, setCount] = useState(0);
       return <div className="p-4 bg-white">...</div>;
     };
     return MyWidget;
     \`\`\`

**Design Philosophy - MINIMAL & AESTHETIC:**
- **Clean, minimal design** inspired by Notion, Linear, and modern tools
- Use subtle colors: whites, soft grays (slate-50, slate-100), with minimal accent colors
- **Typography**: Clean hierarchy with proper spacing, prefer slate-700/slate-600 text colors
- **Spacing**: Generous whitespace, use p-6/p-8, gap-4/gap-6, mb-6/mb-8
- **Buttons**: Subtle with hover states (bg-slate-100 hover:bg-slate-200), rounded-lg corners
- **Borders**: Minimal borders (border-slate-200), subtle shadows (shadow-sm)
- **Icons**: Small, refined (w-4 h-4 or w-5 h-5), use sparingly
- **Colors**: Only add color when functionally important (success: green, danger: red)
- **Layout**: Clean grids, centered content, balanced proportions
- Use \`w-full h-full\` for the root container to fill the widget window.

**Example Request:** "A date idea generator"
**Example Output:**
const DateGenerator = () => {
  const ideas = ["Picnic in the park", "Try a new restaurant", "Movie night at home", "Weekend hiking"];
  const [idea, setIdea] = useState("");
  return (
    <div className="w-full h-full bg-white p-6 flex flex-col">
       <div className="flex items-center gap-2 mb-6">
         <Icons.Heart className="w-5 h-5 text-slate-600"/>
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
`;

const cleanCode = (text: string) => {
  let code = text.replace(/^```(javascript|jsx|tsx)?/g, '').replace(/```$/g, '').trim();
  // Safety cleanup: Remove imports anywhere in the file to prevent runtime crashes
  code = code.replace(/import\s+.*from\s+['"].*['"];?/g, '');
  code = code.replace(/^\s*import\s+.*$/gm, '');
  // Safety cleanup: Convert export default to return
  code = code.replace(/export\s+default\s+/, 'return ');
  return code;
};

export const generateWidgetCode = async (prompt: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return cleanCode(text);
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw new Error("Failed to generate widget. Please try again.");
  }
};

export const updateWidgetCode = async (currentCode: string, instruction: string): Promise<string> => {
  try {
    const prompt = `
    Here is an existing React component code:
    ${currentCode}

    The user wants to modify it with the following instruction:
    "${instruction}"

    **Rules:**
    1. Implement the requested changes while maintaining existing functionality unless asked otherwise.
    2. Return the FULL updated component code (not just the diff).
    3. Follow all original style and syntax rules (no imports, return Component at end).
    4. Keep the component name consistent if possible.
    `;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return cleanCode(text);
  } catch (error) {
    console.error("Gemini update error:", error);
    throw new Error("Failed to update widget. Please try again.");
  }
};
