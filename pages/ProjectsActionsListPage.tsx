/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { User, TeamMember } from '../types';
import { renderPriorityBadge, CollapsibleTableSection } from '../components';
import { DetailsIcon, EditIcon, DeleteIcon, HistoryIcon, ApproveIcon } from '../icons';
import { toPersianDigits } from '../utils';

const isDelayed = (status: string, endDateStr: string) => {
    if (status === 'خاتمه یافته' || !endDateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    return endDate < today;
};

export const ProjectsActionsListPage = ({ projects, actions, onViewDetails, onEditProject, onDeleteProject, onEditAction, onDeleteAction, currentUser, onShowHistory, users, teams }: {
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
    teams: Record<string, TeamMember[]>;
}) => {
    const [titleFilter, setTitleFilter] = useState('');
    const [responsibleFilter, setResponsibleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('active');

    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);
    const allResponsibles = useMemo(() => [...new Set([...projects.map(p => p.projectManager), ...actions.map(a => a.responsible)])].filter(Boolean), [projects, actions]);
    const allStatuses = useMemo(() => ['شروع نشده', 'در حال اجرا', 'خاتمه یافته'], []);

    const filteredItems = useMemo(() => {
        if (!currentUser) return [];
        const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
        
        const visibleProjects = isAdmin ? projects : projects.filter(p => {
            const ownerTeam = teams[p.owner] || [];
            const isTeamAdmin = ownerTeam.some(member => member.username === currentUser.username && member.role === 'ادمین');

            return p.owner === currentUser.username ||
                p.projectManager === currentUser.username ||
                (p.activities && p.activities.some((act:any) => act.responsible === currentUser.username || act.approver === currentUser.username)) ||
                isTeamAdmin;
        });

        const visibleActions = isAdmin ? actions : actions.filter(a => {
            const ownerTeam = teams[a.owner] || [];
            const isTeamAdmin = ownerTeam.some(member => member.username === currentUser.username && member.role === 'ادمین');
            
            return a.owner === currentUser.username ||
                a.responsible === currentUser.username ||
                a.approver === currentUser.username ||
                isTeamAdmin;
        });

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
            
            const statusMatch = (() => {
                if (statusFilter === 'all') return true;
                if (statusFilter === 'active') {
                    return displayStatus === 'در حال اجرا' || displayStatus === 'شروع نشده';
                }
                return displayStatus === statusFilter;
            })();

            return titleMatch && responsibleMatch && statusMatch;
        });

    }, [projects, actions, currentUser, teams, titleFilter, responsibleFilter, statusFilter]);
    
    const statusOrder = { 'شروع نشده': 1, 'در حال اجرا': 2, 'خاتمه یافته': 3 };

    const getActionDisplayStatus = (item: any) => item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
    
    const sortedProjects = useMemo(() => 
        filteredItems.filter(item => item.type === 'project')
        .sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)),
    [filteredItems]);
    
    const sortedActions = useMemo(() => 
        filteredItems.filter(item => item.type === 'action')
        .sort((a, b) => (statusOrder[getActionDisplayStatus(a)] || 99) - (statusOrder[getActionDisplayStatus(b)] || 99)),
    [filteredItems]);


    return (
        <div className="projects-actions-list-page">
            <div className="dashboard-filters">
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
                        <option value="active">جاری و شروع نشده</option>
                        {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="table-wrapper">
                <table className="user-list-table">
                    <thead>
                        <tr>
                            <th>ردیف</th>
                            <th>عنوان</th>
                            <th>وضعیت</th>
                            <th>اهمیت</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.length > 0 && currentUser ? (
                            <>
                                {sortedProjects.length > 0 && (
                                    <CollapsibleTableSection key="projects-section" title="پروژه‌ها" count={sortedProjects.length} defaultOpen>
                                        {sortedProjects.map((item, index) => {
                                            const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
                                            const itemOwnerUsername = item.owner;
                                            const ownerTeam = teams[itemOwnerUsername] || [];
                                            const isCurrentUserAdminInOwnersTeam = ownerTeam.some(
                                                member => member.username === currentUser.username && member.role === 'ادمین'
                                            );
                                            
                                            const canEdit = isAdmin || currentUser.username === item.owner || isCurrentUserAdminInOwnersTeam;
                                            const canDelete = isAdmin || currentUser.username === item.owner || isCurrentUserAdminInOwnersTeam;
                                            
                                            return (
                                                <tr key={`project-${item.id}`}>
                                                    <td>{toPersianDigits(index + 1)}</td>
                                                    <td>
                                                        <div className="title-cell-content">
                                                            {item.status === 'خاتمه یافته' ? (
                                                                <span className="completed-indicator" title="تکمیل شده">
                                                                    <ApproveIcon />
                                                                </span>
                                                            ) : (
                                                                <span 
                                                                    className={`delay-indicator-dot ${isDelayed(item.status, item.projectEndDate) ? 'delayed' : 'on-time'}`}
                                                                    title={isDelayed(item.status, item.projectEndDate) ? 'دارای تاخیر' : 'فاقد تاخیر'}
                                                                ></span>
                                                            )}
                                                            <span>{item.title}</span>
                                                        </div>
                                                    </td>
                                                    <td>{item.status}</td>
                                                    <td>{renderPriorityBadge(item.priority)}</td>
                                                    <td>
                                                        <div className="action-buttons-grid">
                                                            <div className="action-buttons-row">
                                                                <button className="icon-btn details-btn" title="مشاهده جزئیات" onClick={() => onViewDetails(item)}>
                                                                    <DetailsIcon />
                                                                </button>
                                                                {canEdit && (
                                                                    <button className="icon-btn edit-btn" title="ویرایش" onClick={() => onEditProject(item)}>
                                                                        <EditIcon />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="action-buttons-row">
                                                                {canDelete && (
                                                                    <button className="icon-btn delete-btn" title="حذف" onClick={() => onDeleteProject(item.id)}>
                                                                        <DeleteIcon />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </CollapsibleTableSection>
                                )}
                                 {sortedActions.length > 0 && (
                                    <CollapsibleTableSection key="actions-section" title="اقدامات" count={sortedActions.length} defaultOpen>
                                        {sortedActions.map((item, index) => {
                                            const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
                                            const itemOwnerUsername = item.owner;
                                            const ownerTeam = teams[itemOwnerUsername] || [];
                                            const isCurrentUserAdminInOwnersTeam = ownerTeam.some(
                                                member => member.username === currentUser.username && member.role === 'ادمین'
                                            );

                                            const canEdit = isAdmin || currentUser.username === item.owner || isCurrentUserAdminInOwnersTeam;
                                            const canDelete = isAdmin || currentUser.username === item.owner || isCurrentUserAdminInOwnersTeam;
                                            const displayStatus = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;

                                            return (
                                                <tr key={`action-${item.id}`}>
                                                    <td>{toPersianDigits(index + 1)}</td>
                                                    <td>
                                                        <div className="title-cell-content">
                                                            {item.status === 'خاتمه یافته' ? (
                                                                <span className="completed-indicator" title="تکمیل شده">
                                                                    <ApproveIcon />
                                                                </span>
                                                            ) : (
                                                                <span 
                                                                    className={`delay-indicator-dot ${isDelayed(item.status, item.endDate) ? 'delayed' : 'on-time'}`}
                                                                    title={isDelayed(item.status, item.endDate) ? 'دارای تاخیر' : 'فاقد تاخیر'}
                                                                ></span>
                                                            )}
                                                            <span>{item.title}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {displayStatus}
                                                    </td>
                                                    <td>{renderPriorityBadge(item.priority)}</td>
                                                    <td>
                                                        <div className="action-buttons-grid">
                                                            <div className="action-buttons-row">
                                                                <button className="icon-btn details-btn" title="مشاهده جزئیات" onClick={() => onViewDetails(item)}>
                                                                    <DetailsIcon />
                                                                </button>
                                                                {canEdit && (
                                                                    <button className="icon-btn edit-btn" title="ویرایش" onClick={() => onEditAction(item)}>
                                                                        <EditIcon />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="action-buttons-row">
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
                                <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>موردی برای نمایش یافت نشد.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};