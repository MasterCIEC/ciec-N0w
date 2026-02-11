
import React from 'react';
import { SelectProps } from '../../types';

const Select: React.FC<SelectProps> = ({ label, id, error, options, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <select
        id={id}
        className={`block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      >
        {!props.multiple && props.value === "" && (
          <option value="" disabled className="text-gray-500 dark:text-gray-400">Seleccione...</option>
        )}
         {!props.multiple && props.value !== "" && !options.find(o => o.value === props.value) && !options.some(o => o.label === "Todas las Comisiones" && props.value === "") && !options.some(o => o.label === "Seleccione una empresa" && props.value === "") && !options.some(o => o.label === "Seleccione una comisión" && props.value === "") && !options.some(o => o.label === "Seleccione Facilitador" && props.value === "") && (
           // If current value is not in options (e.g. initial empty string), and not "" itself, render select prompt
           // Also check against common placeholder labels that might use an empty value.
           <option value="" disabled className="text-gray-500 dark:text-gray-400">Seleccione...</option>
        )}


        {options.map(option => (
          <option key={option.value} value={option.value} >{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Select;
