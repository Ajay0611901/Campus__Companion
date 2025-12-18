/**
 * Loading Button Component
 * 
 * Reusable button with loading state and customizable loading text
 */

import React from 'react';

interface LoadingButtonProps {
    loading: boolean;
    loadingText?: string;
    children: React.ReactNode;
    onClick?: () => void | Promise<void>;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    type?: 'button' | 'submit' | 'reset';
}

export default function LoadingButton({
    loading,
    loadingText,
    children,
    onClick,
    disabled,
    className = 'btn btn-primary',
    style,
    type = 'button'
}: LoadingButtonProps) {
    const handleClick = async () => {
        if (onClick && !loading && !disabled) {
            await onClick();
        }
    };

    return (
        <button
            type={type}
            className={className}
            onClick={handleClick}
            disabled={disabled || loading}
            style={style}
        >
            {loading ? (
                <>
                    <span className="spinner-icon" style={{
                        display: 'inline-block',
                        marginRight: '8px',
                        animation: 'spin 1s linear infinite'
                    }}>
                        ⏳
                    </span>
                    {loadingText || 'Loading...'}
                </>
            ) : (
                children
            )}
        </button>
    );
}
