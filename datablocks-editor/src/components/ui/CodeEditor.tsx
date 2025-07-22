import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  showLineNumbers?: boolean;
  onError?: (errors: string[]) => void;
  'aria-label'?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  placeholder = '',
  disabled = false,
  className,
  minHeight = 120,
  maxHeight = 400,
  showLineNumbers = true,
  onError,
  'aria-label': ariaLabel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);

  // Update line count when value changes
  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

  // Handle tab key for indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, [value, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Basic syntax error checking for JavaScript
    if (language === 'javascript' && onError) {
      const errors: string[] = [];
      
      // Check for basic syntax issues
      if (newValue.includes('function') && !newValue.includes('{')) {
        errors.push('Missing opening brace after function declaration');
      }
      
      // Check for unmatched braces
      const openBraces = (newValue.match(/{/g) || []).length;
      const closeBraces = (newValue.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push('Unmatched braces');
      }
      
      onError(errors);
    }
  }, [onChange, language, onError]);

  const containerStyle = {
    minHeight: `${minHeight}px`,
    maxHeight: `${maxHeight}px`,
  };

  const textareaStyle = {
    minHeight: `${minHeight}px`,
    maxHeight: `${maxHeight}px`,
  };

  return (
    <div className="relative">
      <div 
        className={cn(
          'relative border border-gray-600 rounded-lg bg-gray-800 overflow-hidden',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        style={containerStyle}
      >
        {/* Line Numbers */}
        {showLineNumbers && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-900 border-r border-gray-600 flex flex-col text-xs text-gray-500 font-mono">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="px-2 py-0.5 text-right leading-5">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Syntax Highlighting Overlay */}
        <pre
          aria-hidden="true"
          className={cn(
            'absolute inset-0 p-3 font-mono text-sm text-transparent pointer-events-none overflow-auto whitespace-pre-wrap break-words',
            showLineNumbers && 'pl-14'
          )}
          style={textareaStyle}
        >
          {value + '\n'}
        </pre>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
          aria-label={ariaLabel}
          role="textbox"
          className={cn(
            'relative w-full h-full p-3 bg-transparent text-gray-100 font-mono text-sm resize-none outline-none overflow-auto whitespace-pre-wrap break-words',
            showLineNumbers && 'pl-14',
            disabled && 'cursor-not-allowed'
          )}
          style={textareaStyle}
        />
      </div>
    </div>
  );
};