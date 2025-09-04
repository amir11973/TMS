/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { CollapsibleTableSection } from '../CollapsibleTable';
import { renderPriorityBadge } from '../PriorityBadge';
import { DetailsIcon } from '../../icons';

export const DashboardDataTable = ({ items, onViewDetails, projects, actions }: { 
    items: any[];
    onViewDetails: (item: any) => void;
    projects: any[];
    actions: any[];
}) => {
    if (items.length === 0) {
        return null; 
    }

    const projectItems = items.filter(item => item.type === 'پروژه');
    const actionItems = items.filter(item => item.type === 'اقدام');

    const handleDetailsClick = (item: any) => {
        const [type, originalIdStr] = item.id.split('-');
        const originalId = parseInt(originalIdStr, 10);
        
        let originalItem = null;
        if (type === 'p' && projects) {
            originalItem = projects.find(p => p.id === originalId);
        } else if (type === 'a' && actions) {
            originalItem = actions.find(a => a.id === originalId);
        }
        
        if (originalItem) {
            // Re-add type for DetailsModal logic
            onViewDetails({ ...originalItem, type: originalItem.projectName ? 'project' : 'action' });
        }
    };


    return (
        <div className="dashboard-card data-table-card">
             <h4 className="chart-title">لیست موارد فیلتر شده</h4>
            <div className="table-container">
                <table className="user-list-table dashboard-data-table">
                    <thead>
                        <tr>
                            <th>عنوان</th>
                            <th>وضعیت</th>
                            <th>اهمیت</th>
                            <th>جزئیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projectItems.length > 0 && (
                            <CollapsibleTableSection title="پروژه‌ها" count={projectItems.length} defaultOpen={true}>
                                {projectItems.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.status}</td>
                                        <td>{renderPriorityBadge(item.priority)}</td>
                                        <td>
                                            <button className="icon-btn details-btn" title="مشاهده جزئیات" onClick={() => handleDetailsClick(item)}>
                                                <DetailsIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </CollapsibleTableSection>
                        )}
                        {actionItems.length > 0 && (
                             <CollapsibleTableSection title="اقدامات" count={actionItems.length} defaultOpen={true}>
                                {actionItems.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.status}</td>
                                        <td>{renderPriorityBadge(item.priority)}</td>
                                        <td>
                                            <button className="icon-btn details-btn" title="مشاهده جزئیات" onClick={() => handleDetailsClick(item)}>
                                                <DetailsIcon />
                                            </button>
                                        </td>
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