/**
 * Composant de formulaire accessible avec labels ARIA
 * Utilisez ce composant pour créer des formulaires accessibles
 */

import React from 'react';

export const FormField = ({ 
  label, 
  error, 
  required = false, 
  children,
  htmlFor,
  description,
  ...props 
}) => {
  const fieldId = htmlFor || props.id;
  const errorId = error ? `${fieldId}-error` : undefined;
  const descriptionId = description ? `${fieldId}-description` : undefined;

  return (
    <div className="mb-4">
      {label && (
        <label 
          htmlFor={fieldId}
          className="block text-sm font-medium text-text-primary mb-1"
        >
          {label}
          {required && <span className="text-danger ml-1" aria-label="required">*</span>}
        </label>
      )}

      {description && (
        <p id={descriptionId} className="text-xs text-text-secondary mb-1">
          {description}
        </p>
      )}

      {React.cloneElement(children, {
        id: fieldId,
        'aria-invalid': error ? 'true' : 'false',
        'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
        ...props,
      })}

      {error && (
        <p id={errorId} className="text-xs text-danger mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export const AccessibleInput = React.forwardRef((props, ref) => (
  <input
    ref={ref}
    className="w-full bg-card-bg border border-border-color rounded-lg px-4 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
    {...props}
  />
));

AccessibleInput.displayName = 'AccessibleInput';

export const AccessibleTextarea = React.forwardRef((props, ref) => (
  <textarea
    ref={ref}
    className="w-full bg-card-bg border border-border-color rounded-lg px-4 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px] resize-y"
    {...props}
  />
));

AccessibleTextarea.displayName = 'AccessibleTextarea';

export const AccessibleSelect = React.forwardRef(({ children, ...props }, ref) => (
  <select
    ref={ref}
    className="w-full bg-card-bg border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
    {...props}
  >
    {children}
  </select>
));

AccessibleSelect.displayName = 'AccessibleSelect';

export const AccessibleButton = React.forwardRef(({ 
  children, 
  variant = 'primary', 
  loading = false, 
  ...props 
}, ref) => {
  const baseClasses = 'font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary';
  
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary-hover text-white focus:ring-offset-dark-navy',
    secondary: 'bg-card-hover hover:bg-border-color text-text-primary focus:ring-offset-dark-navy',
    danger: 'bg-danger hover:bg-red-600 text-white focus:ring-offset-dark-navy',
  };

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary}`}
      disabled={loading || props.disabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Chargement...
        </span>
      ) : (
        children
      )}
    </button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

export const AccessibleCheckbox = React.forwardRef(({ label, ...props }, ref) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      ref={ref}
      type="checkbox"
      className="w-4 h-4 bg-card-bg border border-border-color rounded focus:ring-2 focus:ring-primary focus:ring-offset-dark-navy"
      {...props}
    />
    <span className="text-sm text-text-primary">{label}</span>
  </label>
));

AccessibleCheckbox.displayName = 'AccessibleCheckbox';
