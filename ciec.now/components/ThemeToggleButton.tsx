import React from 'react';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';

export type Theme = 'light' | 'dark';

interface ThemeToggleButtonProps {
  currentTheme: Theme;
  toggleTheme: () => void;
}

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ currentTheme, toggleTheme }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={currentTheme === 'dark'}
      onClick={toggleTheme}
      className={`relative inline-flex items-center h-8 w-[60px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-300 ease-in-out 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800
                  ${currentTheme === 'dark' ? 'bg-slate-700 focus:ring-indigo-500' : 'bg-sky-300 focus:ring-orange-500'}`}
      aria-label={currentTheme === 'dark' ? "Activar modo claro" : "Activar modo oscuro"}
    >
      <span className="sr-only">Cambiar tema</span>
      {/* Knob */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inline-flex items-center justify-center 
                    h-[24px] w-[24px] transform rounded-full shadow-lg ring-0 
                    transition-all duration-300 ease-in-out
                    ${
                      currentTheme === 'dark'
                        ? 'translate-x-[30px] bg-gradient-to-br from-indigo-400 to-purple-500' // (60px button width - 24px knob width - 2px padding - 2px padding for other side = 32px effectively. 30px is approx for visual centering of 24px knob in ~32px travel space when starting slightly offset)
                        : 'translate-x-[2px] bg-gradient-to-br from-yellow-400 to-orange-500'
                    }`}
      >
        {currentTheme === 'dark' ? (
          <MoonIcon className="h-4 w-4 text-white" />
        ) : (
          <SunIcon className="h-4 w-4 text-white" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggleButton;