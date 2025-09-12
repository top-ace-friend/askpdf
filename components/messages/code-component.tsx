"use client";

import { useEffect, useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

// Custom code component that handles both inline code and code blocks
export const CodeComponent = ({ className, children, ...props }: any) => {
  const childrenString = String(children);

  // Detect theme - check if dark mode is active
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(isDark);
    };

    checkTheme();

    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", checkTheme);
    };
  }, []);

  // Check if this is a code block by:
  // 1. Has a language class (lang-*)
  // 2. Contains newlines (multiline)
  // 3. Is longer than typical inline code
  const hasLanguageClass = className && className.startsWith("lang-");
  const hasNewlines = childrenString.includes("\n");
  const isLongCode = childrenString.length > 50;

  const isCodeBlock = hasLanguageClass || hasNewlines || isLongCode;

  if (isCodeBlock) {
    // Extract language from className if available
    const language = hasLanguageClass ? className.replace("lang-", "") : "text";

    return (
      <div className="w-full max-w-full min-w-0 overflow-hidden my-2">
        <div
          className="syntax-highlighter-container"
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            overflow: "hidden",
            display: "block",
          }}
        >
          <SyntaxHighlighter
            language={language}
            style={isDarkMode ? vscDarkPlus : oneLight}
            customStyle={{
              margin: 0,
              padding: "1rem",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              overflow: "auto",
              resize: "none",
              boxSizing: "border-box",
              display: "block",
              lineHeight: "1.5",
            }}
            codeTagProps={{
              style: {
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                display: "block",
              },
            }}
            preTag={({
              children,
              ...preProps
            }: {
              children: any;
              [key: string]: any;
            }) => (
              <pre
                {...preProps}
                style={{
                  ...preProps.style,
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  margin: 0,
                  overflowX: "auto",
                  boxSizing: "border-box",
                  display: "block",
                }}
              >
                {children}
              </pre>
            )}
            wrapLongLines={true}
            showLineNumbers={false}
            {...props}
          >
            {childrenString.replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }

  // For inline code, just return a simple styled span
  return (
    <code
      className="bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono"
      {...props}
    >
      {children}
    </code>
  );
};
