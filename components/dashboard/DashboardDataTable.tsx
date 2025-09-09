/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import { CollapsibleTableSection } from '../CollapsibleTable';
import { renderPriorityBadge } from '../PriorityBadge';
import { DetailsIcon } from '../../icons';
import { toPersianDigits } from '../../utils';

const isDelayed = (status: string, endDateStr: string) => {
    if (status === 'خاتمه یافته' || !endDateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    return endDate < today;
};

export const DashboardDataTable = ({ items, onViewDetails, projects, actions }: { 
    items: any[];
    onViewDetails: (item: any) => void;
    projects: any[];
    actions: any[];
}) => {
    if (items.length === 0) {
        return null; 
    }

    const statusOrder = {
        'شروع نشده': 1,
        'در حال اجرا': 2,
        'خاتمه یافته': 3
    };
    
    // Helper for consistent sorting
    const sortByStatus = (a: any, b: any) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);

    const projectItems = useMemo(() => items.filter(item => item.type === 'پروژه').sort(sortByStatus), [items]);
    const actionItems = useMemo(() => items.filter(item => item.type === 'اقدام').sort(sortByStatus), [items]);

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
                            <th>ردیف</th>
                            <th>عنوان</th>
                            <th>وضعیت</th>
                            <th>اهمیت</th>
                            <th>جزئیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projectItems.length > 0 && (
                            <CollapsibleTableSection key="dashboard-projects" title="پروژه‌ها" count={projectItems.length} defaultOpen={true}>
                                {projectItems.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{toPersianDigits(index + 1)}</td>
                                        <td>
                                            <div className="title-cell-content">
                                                <span>{item.name}</span>
                                                <span 
                                                    className={`delay-indicator-dot ${isDelayed(item.status, item.endDate) ? 'delayed' : 'on-time'}`}
                                                    title={isDelayed(item.status, item.endDate) ? 'دارای تاخیر' : 'فاقد تاخیر'}
                                                ></span>
                                            </div>
                                        </td>
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
                             <CollapsibleTableSection key="dashboard-actions" title="اقدامات" count={actionItems.length} defaultOpen={true}>
                                {actionItems.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{toPersianDigits(index + 1)}</td>
                                        <td>
                                            <div className="title-cell-content">
                                                <span>{item.name}</span>
                                                <span 
                                                    className={`delay-indicator-dot ${isDelayed(item.status, item.endDate) ? 'delayed' : 'on-time'}`}
                                                    title={isDelayed(item.status, item.endDate) ? 'دارای تاخیر' : 'فاقد تاخیر'}
                                                ></span>
                                            </div>
                                        </td>
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