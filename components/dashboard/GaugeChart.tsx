/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { toPersianDigits } from '../../utils';

export const GaugeChart = ({ value, title }: { value: number; title: string }) => {
    const [displayValue, setDisplayValue] = useState(0);
    // Start needle at the 0% position on the right (+90 degrees) for RTL gauge
    const [rotation, setRotation] = useState(90);
    const valueRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);

    const RADIUS = 40;
    const CIRCUMFERENCE = Math.PI * RADIUS;

    useEffect(() => {
        const startValue = valueRef.current;
        const endValue = value;
        valueRef.current = endValue;

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        // Animate percentage text from previous value to new value
        let startTime: number | null = null;
        const duration = 2500; // Slower animation

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            let percentage = Math.min(progress / duration, 1);
            percentage = 1 - Math.pow(1 - percentage, 3); // Ease-out cubic

            const animatedValue = Math.round(startValue + (endValue - startValue) * percentage);

            if (progress < duration) {
                setDisplayValue(animatedValue);
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue);
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);

        // Set needle rotation for right-to-left sweep (0% at 90deg, 100% at -90deg)
        const targetRotation = 90 - (value / 100) * 180;
        setRotation(targetRotation);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };

    }, [value]);

    if (value === null || value === undefined) {
        return <div className="dashboard-card gauge-chart-card"><h4 className="chart-title">{title}</h4><p className="no-data-message">داده‌ای برای نمایش وجود ندارد</p></div>;
    }

    return (
        <div className="dashboard-card gauge-chart-card">
            <h4 className="chart-title">{title}</h4>
            <div className="gauge-container">
                <svg viewBox="0 0 100 57" className="gauge-svg" role="img" aria-label={`Gauge showing ${value}% completion`}>
                    <defs>
                        {/* Flipped gradient for RTL: green on left (100%), red on right (0%) */}
                        <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--c-success)" />
                            <stop offset="50%" stopColor="var(--c-warning)" />
                            <stop offset="100%" stopColor="var(--c-danger)" />
                        </linearGradient>
                    </defs>

                    {/* Background Arc - drawing from right to left */}
                    <path
                        d={`M 90 55 A ${RADIUS} ${RADIUS} 0 0 0 10 55`}
                        stroke="var(--c-header)"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                    />

                    {/* Progress Arc - drawing from right to left */}
                    <path
                        d={`M 90 55 A ${RADIUS} ${RADIUS} 0 0 0 10 55`}
                        stroke="url(#gauge-gradient)"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={CIRCUMFERENCE * (1 - value / 100)}
                        className="gauge-progress-arc"
                    />
                    
                    {/* Flipped labels for RTL: 100 on left, 0 on right */}
                    <text x="10" y="45" textAnchor="middle" className="gauge-text">۱۰۰</text>
                    <text x="90" y="45" textAnchor="middle" className="gauge-text">۰</text>
                    
                    {/* Needle */}
                    <g transform={`rotate(${rotation} 50 55)`} className="gauge-needle-group">
                        <path d="M 49 55 L 51 55 L 50 22 Z" fill="var(--c-primary)" />
                        <circle cx="50" cy="55" r="4" fill="var(--c-primary)" />
                    </g>
                </svg>
                <div className="gauge-value-text">
                    {toPersianDigits(displayValue)}%
                </div>
            </div>
        </div>
    );
};