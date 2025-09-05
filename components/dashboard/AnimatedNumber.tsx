/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';

export const AnimatedNumber = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const valueRef = useRef(0);

    useEffect(() => {
        const startValue = valueRef.current;
        const endValue = value;
        valueRef.current = endValue;
        
        let startTime: number | null = null;
        const duration = 700; // ms

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            let percentage = Math.min(progress / duration, 1);
            
            // Ease-out cubic function for a smoother, more professional animation
            percentage = 1 - Math.pow(1 - percentage, 3);

            const animatedValue = Math.floor(startValue + (endValue - startValue) * percentage);
            
            if (progress < duration) {
                setDisplayValue(animatedValue);
                requestAnimationFrame(animate);
            } else {
                // Ensure the final value is exact
                setDisplayValue(endValue);
            }
        };

        requestAnimationFrame(animate);

    }, [value]);

    return <span className="stat-card-value">{displayValue}</span>;
};