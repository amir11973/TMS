/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { CollapsibleTableSection } from '../CollapsibleTable';
import { renderPriorityBadge } from '../PriorityBadge';

export const DashboardDataTable = ({ items }: { items: any[] }) => {
    if (items.length === 0) {
        return null; 
    }

    const projects = items.filter(item => item.type === 'پروژه');
    const actions = items.filter(item => item.type === 'اقدام');

    return (
        <div className="dashboard-card data-table-card">
             <h4 className="chart-title">لیست موارد فیلتر شده</h4>
            <div className="table-container">
                <table className="user-list-table dashboard-data-table">
                    <thead>
                        <tr>
                            <th>عنوان</th>
                            <th>مالک</th>
                            <th>مسئول</th>
                            <th>بخش</th>
                            <th>وضعیت</th>
                            <th>اهمیت</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.length > 0 && (
                            <CollapsibleTableSection title="پروژه‌ها" count={projects.length} defaultOpen={true}>
                                {projects.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.owner}</td>
                                        <td>{item.responsible}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.status}</td>
                                        <td>{renderPriorityBadge(item.priority)}</td>
                                    </tr>
                                ))}
                            </CollapsibleTableSection>
                        )}
                        {actions.length > 0 && (
                             <CollapsibleTableSection title="اقدامات" count={actions.length} defaultOpen={true}>
                                {actions.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.owner}</td>
                                        <td>{item.responsible}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.status}</td>
                                        <td>{renderPriorityBadge(item.priority)}</td>
                                    </tr>
                                ))}
                            </CollapsibleTableSection>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
