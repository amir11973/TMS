/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { StatCard } from './StatCard';
import { toPersianDigits } from '../../utils';

export const PieChart = ({ data, isDonut = false, title }: { data: { name: string; value: number; color: string }[], isDonut?: boolean, title: string }) => {
    if (!data || data.length === 0 || data.every(d => d.value === 0)) {
        return <StatCard title={title}><p className="no-data-message">داده‌ای برای نمایش وجود ندارد</p></StatCard>;
    }
    
    const total = data.reduce((acc, item) => acc + item.value, 0);
    
    let cumulativePercent = 0;
    const gradientStops = data.map(item => {
        const percent = (item.value / total) * 100;
        const stop = `${item.color} ${cumulativePercent}% ${cumulativePercent + percent}%`;
        cumulativePercent += percent;
        return stop;
    }).join(', ');

    const gradient = `conic-gradient(${gradientStops})`;

    return (
        <div className="dashboard-card">
            <h4 className="chart-title">{title}</h4>
            <div className="pie-chart-container">
                <div className={`pie-chart ${isDonut ? 'donut' : ''}`} style={{ background: gradient }} role="img" aria-label={title}></div>
                <div className="pie-chart-legend">
                    {data.filter(item => item.value > 0).map(item => (
                        <div key={item.name} className="legend-item">
                            <span className="legend-color-box" style={{ backgroundColor: item.color }}></span>
                            <span className="legend-label">{item.name} ({toPersianDigits(item.value)})</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};