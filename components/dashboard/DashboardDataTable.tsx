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

    const groupItemsByStatus = (itemsToGroup: any[]) => {
        return itemsToGroup.reduce((acc, item) => {
            const status = item.status || 'نامشخص';
            if (!acc[status]) {
                acc[status] = [];
            }
            acc[status].push(item);
            return acc;
        }, {} as Record<string, any[]>);
    };

    const groupedProjects = groupItemsByStatus(projectItems);
    const groupedActions = groupItemsByStatus(actionItems);

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
            onViewDetails({ ...originalItem, type: originalItem.projectManager !== undefined ? 'project' : 'action' });
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
                            <th>اهمیت</th>
                            <th>جزئیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projectItems.length > 0 && (
                            <CollapsibleTableSection key="dashboard-projects" title="پروژه‌ها" count={projectItems.length} defaultOpen={true}>
                                {/* FIX: Explicitly type array from Object.entries to resolve 'unknown' type error. */}
                                {Object.entries(groupedProjects).map(([status, itemsInStatus]: [string, any[]]) => (
                                    <CollapsibleTableSection key={`dashboard-project-status-${status}`} title={status} count={itemsInStatus.length} defaultOpen={true} level={1}>
                                        {itemsInStatus.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.name}</td>
                                                <td>{renderPriorityBadge(item.priority)}</td>
                                                <td>
                                                    <button className="icon-btn details-btn" title="مشاهده جزئیات" onClick={() => handleDetailsClick(item)}>
                                                        <DetailsIcon />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </CollapsibleTableSection>
                                ))}
                            </CollapsibleTableSection>
                        )}
                        {actionItems.length > 0 && (
                             <CollapsibleTableSection key="dashboard-actions" title="اقدامات" count={actionItems.length} defaultOpen={true}>
                                {/* FIX: Explicitly type array from Object.entries to resolve 'unknown' type error. */}
                                {Object.entries(groupedActions).map(([status, itemsInStatus]: [string, any[]]) => (
                                     <CollapsibleTableSection key={`dashboard-action-status-${status}`} title={status} count={itemsInStatus.length} defaultOpen={true} level={1}>
                                        {itemsInStatus.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.name}</td>
                                                <td>{renderPriorityBadge(item.priority)}</td>
                                                <td>
                                                    <button className="icon-btn details-btn" title="مشاهده جزئیات" onClick={() => handleDetailsClick(item)}>
                                                        <DetailsIcon />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </CollapsibleTableSection>
                                ))}
                            </CollapsibleTableSection>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};