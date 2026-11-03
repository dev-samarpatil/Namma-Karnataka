// c:\Namma Karnataka\frontend\src\components\ui\button.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'warning' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type ButtonShape = 'square' | 'rounded' | 'circle';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const RADIUS: Record<ButtonShape, string> = {
  square: '6px',
  rounded: '10px',
  circle: '9999px',
};

const HEIGHT: Record<ButtonSize, string> = {
  sm: '32px',
  md: '40px',
  lg: '48px',
  icon: '40px',
};

const PADDING_H: Record<ButtonSize, string> = {
  sm: '10px',
  md: '16px',
  lg: '20px',
  icon: '0px',
};

const FONT_SIZE: Record<ButtonSize, string> = {
  sm: '0.8125rem',
  md: '0.875rem',
  lg: '0.9375rem',
  icon: '0px',
};

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: '#0798B5',
    color: '#ffffff',
    border: '1px solid #0798B5',
  },
  secondary: {
    background: '#ffffff',
    color: '#172033',
    border: '1px solid #DCE3EA',
  },
  tertiary: {
    background: 'transparent',
    color: '#172033',
    border: '1px solid transparent',
  },
  warning: {
    background: '#F59E0B',
    color: '#172033',
    border: '1px solid #F59E0B',
  },
  destructive: {
    background: '#DC2626',
    color: '#ffffff',
    border: '1px solid #DC2626',
  },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      shape = 'rounded',
      prefixIcon,
      suffixIcon,
      loading = false,
      fullWidth = false,
      children,
      disabled,
      style,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const isIconOnly = size === 'icon' || (!children && (prefixIcon || suffixIcon));

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      height: HEIGHT[size],
      minWidth: isIconOnly ? HEIGHT[size] : undefined,
      width: isIconOnly ? HEIGHT[size] : fullWidth ? '100%' : undefined,
      paddingLeft: isIconOnly ? '0' : PADDING_H[size],
      paddingRight: isIconOnly ? '0' : PADDING_H[size],
      fontSize: FONT_SIZE[size],
      fontWeight: 600,
      fontFamily: 'inherit',
      lineHeight: 1,
      borderRadius: RADIUS[shape],
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.5 : 1,
      transition: 'background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
      whiteSpace: 'nowrap',
      textDecoration: 'none',
      outline: 'none',
      boxSizing: 'border-box',
      flexShrink: 0,
      ...VARIANT_STYLES[variant],
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={baseStyle}
        {...rest}
      >
        {loading ? (
          <Loader2 size={15} strokeWidth={2} style={{ animation: 'nk-spin 0.7s linear infinite' }} />
        ) : prefixIcon ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }} aria-hidden="true">
            {prefixIcon}
          </span>
        ) : null}
        {children && (
          <span>{children}</span>
        )}
        {!loading && suffixIcon && (
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }} aria-hidden="true">
            {suffixIcon}
          </span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
