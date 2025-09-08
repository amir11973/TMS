/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { toPersianDigits } from '../../utils';

export const BarChart = ({ data, title, color, orientation = 'vertical' }: { data: { name: string; value: number }[], title: string, color: string, orientation?: 'vertical' | 'horizontal' }) => {
     if (!data || data.length === 0 || data.every(d => d.value === 0)) {
        return <div className="dashboard-card bar-chart-card"><h4 className="chart-title">{title}</h4><p className="no-data-message">داده‌ای برای نمایش وجود ندارد</p></div>;
    }
    const maxValue = Math.max(...data.map(item => item.value), 0);

    return (
        <div className={`dashboard-card bar-chart-card ${orientation}`}>
            <h4 className="chart-title">{title}</h4>
            <div className={`bar-chart-container ${orientation}`}>
                {data.map((item, index) => (
                    <div key={item.name} className="bar-item">
                        <div className="bar-wrapper">
                            <div 
                                className="bar" 
                                style={{ 
                                    [orientation === 'vertical' ? 'height' : 'width']: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%',
                                    backgroundColor: color,
                                    animationDelay: `${index * 75}ms`
                                }}
                                title={`${item.name}: ${toPersianDigits(item.value)}`}
                            >
                                {item.value > 0 && <span className="bar-value">{toPersianDigits(item.value)}</span>}
                            </div>
                        </div>
                        <span className="bar-label">{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};