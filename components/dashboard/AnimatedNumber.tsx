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
        const duration = 500; // ms

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            const animatedValue = Math.floor(startValue + (endValue - startValue) * percentage);
            setDisplayValue(animatedValue);

            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);

    }, [value]);

    return <span className="stat-card-value">{displayValue}</span>;
};
