import React, { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';

// Add global declaration to fix TypeScript error for window.Babel
declare global {
  interface Window {
    Babel: any;
  }
}

interface DynamicWidgetProps {
  code: string;
  onError: (error: string) => void;
}

export const DynamicWidget = React.memo(({ code, onError }: DynamicWidgetProps) => {
  const [Component, setComponent] = useState<React.FC | null>(null);
  const [error, setError] = useState<string | null>(null);

  // We use a ref for the onError callback so we can call the latest version
  // without adding it to the useEffect dependency array.
  // This is CRITICAL: if onError is in the deps, the widget recompiles on every render (drag),
  // causing the internal state (useState inside the widget) to reset.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!code) return;

    try {
      // 1. Wrap the code in an IIFE (Immediately Invoked Function Expression)
      // This is crucial because the AI generates code like "const App = ...; return App;"
      // A top-level 'return' is invalid JS syntax unless inside a function.
      const wrappedCode = `(() => {
${code}
})()`;

      // 2. Transpile JSX using Babel Standalone
      if (!window.Babel) {
        throw new Error("Babel compiler not loaded");
      }

      // 'allowReturnOutsideFunction' allows us to use the 'return Component' pattern safely before we wrap it
      // though our manual wrapping above also handles it, this is a safety net for the parser.
      const transformResult = window.Babel.transform(wrappedCode, {
        presets: [['react', { runtime: 'classic' }]],
        parserOpts: { allowReturnOutsideFunction: true },
        filename: 'widget.js',
      });

      const transpiled = transformResult.code;

      // 3. Create the factory function
      // We inject dependencies into the function scope manually
      const scopeKeys = ['React', 'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'Icons'];
      const scopeValues = [React, React.useState, React.useEffect, React.useRef, React.useCallback, React.useMemo, LucideIcons];

      // 4. Execute to get the React Component
      const factory = new Function(...scopeKeys, `return ${transpiled};`);
      
      const GeneratedComponent = factory(...scopeValues);

      if (typeof GeneratedComponent !== 'function') {
        throw new Error("The generated code did not return a valid React component. Ensure the code ends with 'return ComponentName;'");
      }

      setComponent(() => GeneratedComponent);
      setError(null);
    } catch (err: any) {
      console.error("Widget Runtime Error:", err);
      let msg = err.message || "Unknown runtime error";
      
      if (msg.includes('unknown:')) {
        msg = "Compilation Error: " + msg.replace('unknown:', '').trim();
      }
      
      setError(msg);
      onErrorRef.current(msg);
    }
  }, [code]); // Dependency is ONLY code now. Dragging/Resizing will not trigger this.

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-red-50 text-red-600 overflow-auto no-drag">
        <LucideIcons.AlertTriangle className="w-8 h-8 mb-2 flex-shrink-0" />
        <p className="text-sm font-semibold">Widget Crashed</p>
        <pre className="text-xs mt-2 opacity-75 whitespace-pre-wrap font-mono text-left w-full bg-red-100 p-2 rounded select-text">{error}</pre>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 bg-white">
        <LucideIcons.Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // Error boundary for rendering phase
  return (
    <div className="w-full h-full bg-white relative">
        <ErrorBoundary onError={(msg) => setError(msg)}>
        <Component />
        </ErrorBoundary>
    </div>
  );
});

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError: (e: string) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    this.props.onError(error.message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}