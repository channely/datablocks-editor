import React from 'react';
import { cn } from '../../utils/cn';
import { CheckIcon } from '@heroicons/react/24/outline';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, ...props }, ref) => {
    const checkboxId = React.useId();

    return (
      <div className="space-y-1">
        <div className="flex items-start gap-3">
          <div className="relative flex items-center">
            <input
              id={checkboxId}
              type="checkbox"
              className={cn(
                'w-4 h-4 bg-gray-700 border border-gray-600 rounded',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900',
                'checked:bg-blue-600 checked:border-blue-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error && 'border-red-500 focus:ring-red-500',
                className
              )}
              ref={ref}
              {...props}
            />
            {props.checked && (
              <CheckIcon className="absolute w-3 h-3 text-white pointer-events-none left-0.5 top-0.5" />
            )}
          </div>
          
          {(label || description) && (
            <div className="flex-1">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className="block text-sm font-medium text-gray-200 cursor-pointer"
                >
                  {label}
                </label>
              )}
              {description && (
                <p className="text-sm text-gray-400 mt-1">{description}</p>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-red-400 ml-7">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };