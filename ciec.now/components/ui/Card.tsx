// components/ui/Card.tsx

import React from 'react';

// --- Card ---
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`bg-white dark:bg-slate-800/80 rounded-xl border border-gray-200/60 dark:border-slate-700/60 shadow-lg shadow-gray-200/50 dark:shadow-black/20 backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${className}`}
    {...props}
  />
));
Card.displayName = 'Card';

// --- CardHeader ---
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`p-4 md:p-6 border-b border-gray-200 dark:border-slate-700 ${className}`}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// --- CardTitle ---
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// --- CardDescription ---
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// --- CardContent ---
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={`p-4 md:p-6 ${className}`} {...props} />
));
CardContent.displayName = 'CardContent';

// Exportación nombrada de todos los componentes para que coincida con la importación
export { Card, CardHeader, CardTitle, CardDescription, CardContent };
