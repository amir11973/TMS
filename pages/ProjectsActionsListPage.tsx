/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { renderPriorityBadge, CollapsibleTableSection } from '../components';
import { DetailsIcon, EditIcon, DeleteIcon, HistoryIcon } from '../icons';

export const ProjectsActionsListPage = ({ projects, actions, onViewDetails, onEditProject, onDeleteProject, onEditAction, onDeleteAction, currentUser, onShowHistory, users }: {
    projects: any[];
    actions: any[];
    onViewDetails: (item: any) => void;
    onEditProject: (project: any) => void;
    onDeleteProject: (id: number) => void;
    onEditAction: (action: any) => void;
    onDeleteAction: (id: number) => void;
    currentUser: User | null;
    onShowHistory: (history: any[]) => void;
    users: User[];
}) => {
    const [titleFilter, setTitleFilter] = useState('');
    const [responsibleFilter, setResponsibleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);
    const allResponsibles = useMemo(() => [...new Set([...projects.map(p => p.projectManager), ...actions.map(a => a.responsible)])].filter(Boolean), [projects, actions]);
    const allStatuses = useMemo(() => ['شروع نشده', 'در حال اجرا', 'خاتمه یافته'], []);

    const filteredItems = useMemo(() => {
        if (!currentUser) return [];
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
            ...visibleProjects.map(p => ({ ...p, type: 'project', responsible: p.projectManager })),
            ...visibleActions.map(a => ({ ...a, type: 'action' }))
        ];

        return allVisibleItems.filter(item => {
            const isProject = item.type === 'project';
            const displayStatus = isProject 
                ? item.status 
                : (item.status === 'ارسال برای تایید' ? (item.underlyingStatus || item.status) : item.status);
            const titleMatch = !titleFilter || item.title.toLowerCase().includes(titleFilter.toLowerCase());
            const responsibleMatch = responsibleFilter === 'all' || item.responsible === responsibleFilter;
            const statusMatch = statusFilter === 'all' || displayStatus === statusFilter;
            return titleMatch && responsibleMatch && statusMatch;
        });

    }, [projects, actions, currentUser, titleFilter, responsibleFilter, statusFilter]);
    
    const projectItems = filteredItems.filter(item => item.type === 'project');
    const actionItems = filteredItems.filter(item => item.type === 'action');

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
                    <label htmlFor="responsible-filter">مسئول</label>
                    <select id="responsible-filter" value={responsibleFilter} onChange={e => setResponsibleFilter(e.target.value)}>
                        <option value="all">همه</option>
                        {allResponsibles.map(r => <option key={r} value={r}>{userMap.get(r) || r}</option>)}
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
            
            <div className="table-wrapper">
                <table className="user-list-table">
                    <thead>
                        <tr>
                            <th>عنوان</th>
                            <th>اهمیت</th>
                            <th>وضعیت</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.length > 0 && currentUser ? (
                            <>
                                {projectItems.length > 0 && (
                                    <CollapsibleTableSection title="پروژه‌ها" count={projectItems.length} defaultOpen>
                                        {projectItems.map(item => {
                                            const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
                                            const canEdit = isAdmin || currentUser.username === item.owner || currentUser.username === item.responsible;
                                            const canDelete = isAdmin || currentUser.username === item.owner;
                                            return (
                                                <tr key={`project-${item.id}`}>
                                                    <td>{item.title}</td>
                                                    <td>{renderPriorityBadge(item.priority)}</td>
                                                    <td>{item.status}</td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button className="icon-btn details-btn" title="مشاهده جزئیات" onClick={() => onViewDetails(item)}>
                                                                <DetailsIcon />
                                                            </button>
                                                            {canEdit && (
                                                                <button className="icon-btn edit-btn" title="ویرایش" onClick={() => onEditProject(item)}>
                                                                    <EditIcon />
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button className="icon-btn delete-btn" title="حذف" onClick={() => onDeleteProject(item.id)}>
                                                                    <DeleteIcon />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </CollapsibleTableSection>
                                )}
                                 {actionItems.length > 0 && (
                                    <CollapsibleTableSection title="اقدامات" count={actionItems.length} defaultOpen>
                                        {actionItems.map(item => {
                                            const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
                                            const canEdit = isAdmin || currentUser.username === item.owner || currentUser.username === item.responsible;
                                            const canDelete = isAdmin || currentUser.username === item.owner;
                                            const displayStatus = item.status === 'ارسال برای تایید' ? (item.underlyingStatus || item.status) : item.status;
                                            return (
                                                <tr key={`action-${item.id}`}>
                                                    <td>{item.title}</td>
                                                    <td>{renderPriorityBadge(item.priority)}</td>
                                                    <td>{displayStatus}</td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button className="icon-btn details-btn" title="مشاهده جزئیات" onClick={() => onViewDetails(item)}>
                                                                <DetailsIcon />
                                                            </button>
                                                            {canEdit && (
                                                                <button className="icon-btn edit-btn" title="ویرایش" onClick={() => onEditAction(item)}>
                                                                    <EditIcon />
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button className="icon-btn delete-btn" title="حذف" onClick={() => onDeleteAction(item.id)}>
                                                                    <DeleteIcon />
                                                                </button>
                                                            )}
                                                            {item.history && (
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
                                )}
                            </>
                        ) : (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>موردی برای نمایش یافت نشد.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};