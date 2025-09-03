/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { CollapsibleTableSection, renderPriorityBadge } from '../components';
import { DetailsIcon, EditIcon, DeleteIcon, HistoryIcon } from '../icons';

export const ProjectsActionsListPage = ({ projects, actions, onViewDetails, onEditProject, onDeleteProject, onEditAction, onDeleteAction, currentUser, onShowHistory }: {
    projects: any[];
    actions: any[];
    onViewDetails: (item: any) => void;
    onEditProject: (project: any) => void;
    onDeleteProject: (id: number) => void;
    onEditAction: (action: any) => void;
    onDeleteAction: (id: number) => void;
    currentUser: User | null;
    onShowHistory: (history: any[]) => void;
}) => {
    const [titleFilter, setTitleFilter] = useState('');
    const [unitFilter, setUnitFilter] = useState('all');
    const [responsibleFilter, setResponsibleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const allUnits = useMemo(() => [...new Set([...projects.map(p => p.unit), ...actions.map(a => a.unit)])], [projects, actions]);
    const allResponsibles = useMemo(() => [...new Set([...projects.map(p => p.projectManager), ...actions.map(a => a.responsible)])].filter(Boolean), [projects, actions]);
    const allStatuses = useMemo(() => ['شروع نشده', 'در حال اجرا', 'خاتمه یافته'], []);

    const groupedItems = useMemo(() => {
        if (!currentUser) return {};
        const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
        
        const visibleProjects = isAdmin ? projects : projects.filter(p => 
            p.owner === currentUser.username ||
            p.projectManager === currentUser.username ||
            (p.activities && p.activities.some((act:any) => act.responsible === currentUser.username || act.approver === currentUser.username))
        );
        const visibleActions = isAdmin ? actions : actions.filter(a => 
            a.owner === currentUser.username ||
            a.responsible === currentUser.username ||
            a.approver === currentUser.username
        );

        const allVisibleItems = [
            ...visibleProjects.map(p => ({ ...p, type: 'project', title: p.projectName, status: p.status, responsible: p.projectManager })),
            ...visibleActions.map(a => ({ ...a, type: 'action' }))
        ];

        const filtered = allVisibleItems.filter(item => {
            const isProject = item.type === 'project';
            const displayStatus = isProject 
                ? item.status 
                : (item.status === 'ارسال برای تایید' ? (item.underlyingStatus || item.status) : item.status);
            const titleMatch = !titleFilter || item.title.toLowerCase().includes(titleFilter.toLowerCase());
            const unitMatch = unitFilter === 'all' || item.unit === unitFilter;
            const responsibleMatch = responsibleFilter === 'all' || item.responsible === responsibleFilter;
            const statusMatch = statusFilter === 'all' || displayStatus === statusFilter;
            return titleMatch && unitMatch && responsibleMatch && statusMatch;
        });

        return filtered.reduce((acc, item) => {
            const type = item.type === 'project' ? 'پروژه‌ها' : 'اقدامات';
            const unit = item.unit || 'نامشخص';
            
            if (!acc[type]) {
                acc[type] = {};
            }
            if (!acc[type][unit]) {
                acc[type][unit] = [];
            }
            acc[type][unit].push(item);
            return acc;
        }, {} as Record<string, Record<string, any[]>>);

    }, [projects, actions, currentUser, titleFilter, unitFilter, responsibleFilter, statusFilter]);

    return (
        <div className="projects-actions-list-page">
            <div className="dashboard-filters" style={{marginBottom: '24px'}}>
                <div className="filter-group">
                    <label htmlFor="title-filter">عنوان</label>
                    <input 
                        type="text" 
                        id="title-filter" 
                        value={titleFilter} 
                        onChange={e => setTitleFilter(e.target.value)} 
                        placeholder="جستجو بر اساس عنوان..."
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="unit-filter">بخش</label>
                    <select id="unit-filter" value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
                        <option value="all">همه</option>
                        {allUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="responsible-filter">مسئول</label>
                    <select id="responsible-filter" value={responsibleFilter} onChange={e => setResponsibleFilter(e.target.value)}>
                        <option value="all">همه</option>
                        {allResponsibles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="status-filter">وضعیت</label>
                    <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">همه</option>
                        {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
            
            <table className="user-list-table">
                <thead>
                    <tr>
                        <th>عنوان</th>
                        <th>مالک</th>
                        <th>مسئول</th>
                        <th>بخش</th>
                        <th>اهمیت</th>
                        <th>وضعیت</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(groupedItems).length > 0 && currentUser ? (
                        Object.entries(groupedItems).sort((a, b) => a[0].localeCompare(b[0])).map(([type, unitGroups]) => {
                            const totalInType = Object.values(unitGroups).reduce((sum: number, items: any[]) => sum + items.length, 0);
                            return (
                                <CollapsibleTableSection key={type} title={type} count={totalInType} defaultOpen={true} level={0}>
                                    {Object.entries(unitGroups).sort((a, b) => a[0].localeCompare(b[0])).map(([unit, items]) => (
                                        <CollapsibleTableSection key={`${type}-${unit}`} title={`بخش: ${unit}`} count={items.length} defaultOpen={true} level={1}>
                                            {items.map(item => {
                                                const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
                                                const isProject = item.type === 'project';
                                                
                                                const canEdit = isAdmin || currentUser.username === item.owner || currentUser.username === item.responsible;
                                                const canDelete = isAdmin || currentUser.username === item.owner;
                                                
                                                const displayStatus = isProject 
                                                    ? item.status 
                                                    : (item.status === 'ارسال برای تایید' ? (item.underlyingStatus || item.status) : item.status);

                                                return (
                                                    <tr key={`${item.type}-${item.id}`}>
                                                        <td>{item.title}</td>
                                                        <td>{item.owner}</td>
                                                        <td>{item.responsible}</td>
                                                        <td>{item.unit}</td>
                                                        <td>{renderPriorityBadge(item.priority)}</td>
                                                        <td>{displayStatus}</td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                <button className="icon-btn details-btn" title="مشاهده جزئیات" onClick={() => onViewDetails(item)}>
                                                                    <DetailsIcon />
                                                                </button>
                                                                {canEdit && (
                                                                    <button className="icon-btn edit-btn" title="ویرایش" onClick={() => isProject ? onEditProject(item) : onEditAction(item)}>
                                                                        <EditIcon />
                                                                    </button>
                                                                )}
                                                                {canDelete && (
                                                                    <button className="icon-btn delete-btn" title="حذف" onClick={() => isProject ? onDeleteProject(item.id) : onDeleteAction(item.id)}>
                                                                        <DeleteIcon />
                                                                    </button>
                                                                )}
                                                                {!isProject && item.history && (
                                                                    <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(item.history)}>
                                                                        <HistoryIcon />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </CollapsibleTableSection>
                                    ))}
                                </CollapsibleTableSection>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>موردی برای نمایش یافت نشد.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
