/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const StatCard = ({ title, value, children }: { title: string; value?: React.ReactNode; children?: React.ReactNode }) => (
    <div className="dashboard-card stat-card">
        <h4 className="chart-title">{title}</h4>
        {children ? children : <div className="stat-card-value">{value}</div>}
    </div>
);
