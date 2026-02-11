
import React from 'react';
import { InputProps } from '../../types';

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, className = '', prefix, containerClassName, ...props }, ref) => {
    return (
      <div className={`w-full ${containerClassName || ''}`}>
        {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
        <div className="relative rounded-md shadow-sm">
           {prefix && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 dark:text-gray-400 sm:text-sm">{prefix}</span>
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={`block w-full py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 dark:placeholder-gray-400 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${error ? 'border-red-500' : ''} ${prefix ? 'pl-7 pr-3' : 'px-3'} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;