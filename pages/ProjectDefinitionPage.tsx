/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import moment from 'moment-jalaali';
import { User, TeamMember } from '../types';
import { getTodayString } from '../constants';
import { supabase, handleSupabaseError } from '../supabaseClient';
import { EditIcon, DeleteIcon, HistoryIcon, DetailsIcon, ApproveIcon } from '../icons';
import { renderPriorityBadge, JalaliDatePicker } from '../components';
// FIX: Corrected import path to avoid conflict with empty modals.tsx file.
import { ActivityModal } from '../modals/index';
import { toPersianDigits } from '../utils';

const isDelayed = (status: string, endDateStr: string) => {
    if (status === 'خاتمه یافته' || !endDateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    return endDate < today;
};

export const ProjectDefinitionPage = ({ users, sections, onSave, projectToEdit, onRequestConfirmation, onShowHistory, currentUser, teamMembers, onUpdateProject, isOpen, onClose, onViewDetails, onRequestAlert, teams, onSetIsActionLoading }: {
    users: User[];
    sections: string[];
    onSave: (project: any) => void;
    projectToEdit: any;
    onRequestConfirmation: (props: any) => void;
    onShowHistory: (history: any[]) => void;
    currentUser: User | null;
    teamMembers: TeamMember[];
    teams: Record<string, TeamMember[]>;
    onUpdateProject: (project: any) => void;
    isOpen: boolean;
    onClose: () => void;
    onViewDetails: (item: any) => void;
    onRequestAlert: (props: any) => void;
    onSetIsActionLoading: (isLoading: boolean) => void;
}) => {
    const initialProjectState = {
        title: '', projectManager: '', unit: sections[0] || '', priority: 'متوسط',
        projectStartDate: getTodayString(), projectEndDate: getTodayString(), projectGoal: '',
        activities: [],
        owner: '',
        isNew: false,
        status: 'شروع نشده',
        id: null,
        use_workflow: true
    };
    const [project, setProject] = useState(initialProjectState);
    const [activeTab, setActiveTab] = useState('main'); // main or activities
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [activityStatusFilter, setActivityStatusFilter] = useState('active');

    const { readOnly = false } = projectToEdit || {};
    
    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);
    
    const projectManagers = useMemo(() => {
        const owner = project.owner || currentUser?.username;
        if (!owner) return [];
        const ownerTeam = teams[owner] || [];
        const teamUsernames = new Set(ownerTeam.map(m => m.username));
        teamUsernames.add(owner);
        return users.filter(u => teamUsernames.has(u.username));
    }, [project.owner, currentUser, teams, users]);

    const canManageActivities = useMemo(() => {
        if (!currentUser || !project || readOnly) return false;
        const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
        if (isAdmin) return true;
        
        const projectOwnerUsername = project.owner;
        if (currentUser.username === projectOwnerUsername) return true;

        const ownerTeam = teams[projectOwnerUsername] || [];
        const isCurrentUserAdminInOwnersTeam = ownerTeam.some(
            member => member.username === currentUser.username && member.role === 'ادمین'
        );
        return isCurrentUserAdminInOwnersTeam;
    }, [currentUser, project, teams, readOnly]);

    const activityResponsibleUsers = useMemo(() => {
        const owner = project.owner || currentUser?.username;
        if (!owner) return [];
        const ownerTeam = teams[owner] || [];
        const teamUsernames = new Set(ownerTeam.map(m => m.username));
        teamUsernames.add(owner);
        return users.filter(u => teamUsernames.has(u.username));
    }, [project.owner, currentUser, teams, users]);

    const activityApproverUsers = useMemo(() => {
        const owner = project.owner || currentUser?.username;
        if (!owner) return [];
        const ownerTeam = teams[owner] || [];
        const approverUsernames = new Set(
            ownerTeam
                .filter(m => m.role === 'ادمین' || m.role === 'مدیر')
                .map(m => m.username)
        );
        approverUsernames.add(owner);
        return users.filter(u => approverUsernames.has(u.username));
    }, [project.owner, currentUser, teams, users]);

    useEffect(() => {
        if (isOpen) {
            if (projectToEdit) {
                const isDifferentProject = project.id !== projectToEdit.id;
                // FIX: Ensure owner is set from current user for new projects
                const projectWithOwner = { 
                    ...initialProjectState, 
                    ...projectToEdit,
                    owner: projectToEdit.isNew ? currentUser!.username : projectToEdit.owner,
                    projectManager: projectToEdit.isNew ? currentUser!.username : projectToEdit.projectManager
                };
                setProject(projectWithOwner);
    
                if (isDifferentProject) { 
                    setActiveTab(projectToEdit.initialTab || 'main');
                    setActivityStatusFilter('active');
                }
            } else { // New project logic, just in case
                setProject({...initialProjectState, owner: currentUser!.username, projectManager: currentUser!.username });
                setActiveTab('main');
            }
        }
    }, [projectToEdit, isOpen, currentUser]);
    
    const filteredActivities = useMemo(() => {
        const activities = project.activities || [];
        if (activityStatusFilter === 'all') {
            return activities;
        }
        return activities.filter((activity: any) => {
            const displayStatus = activity.status === 'ارسال برای تایید' ? activity.underlyingStatus : activity.status;
            if (activityStatusFilter === 'active') {
                return displayStatus === 'در حال اجرا' || displayStatus === 'شروع نشده';
            }
            return displayStatus === activityStatusFilter;
        });
    }, [project.activities, activityStatusFilter]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'projectEndDate' && moment(value).isBefore(project.projectStartDate)) {
            onRequestAlert({
                title: 'تاریخ نامعتبر',
                message: 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.'
            });
            return;
        }

        const updatedProject = { ...project, [name]: value };

        if (name === 'projectStartDate' && moment(updatedProject.projectEndDate).isBefore(value)) {
            updatedProject.projectEndDate = value;
        }

        setProject(updatedProject);
    };
    
    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        onSave(project);
    };

    const handleAddActivity = () => {
        setEditingActivity(null);
        setIsActivityModalOpen(true);
    };
    
    const handleEditActivity = (activity: any) => {
        setEditingActivity(activity);
        setIsActivityModalOpen(true);
    };

    const handleViewActivityDetails = (activity: any) => {
        onViewDetails({
            ...activity,
            type: 'activity',
            parentName: project.title
        });
    };

    const handleDeleteActivity = (activityId: number) => {
         const activityToDelete = project.activities.find((a:any) => a.id === activityId);
         onRequestConfirmation({
            title: 'حذف فعالیت',
            message: `آیا از حذف فعالیت "${activityToDelete?.title}" اطمینان دارید؟`,
            onConfirm: async () => {
                onSetIsActionLoading(true);
                try {
                    const { error } = await supabase.from('activities').delete().eq('id', activityId);
                    handleSupabaseError(error, 'deleting activity');
                    if (!error) {
                        const updatedActivities = project.activities.filter((a:any) => a.id !== activityId);
                        const updatedProject = { ...project, activities: updatedActivities };
                        setProject(updatedProject);
                        onUpdateProject(updatedProject);
                    }
                } finally {
                    onSetIsActionLoading(false);
                }
            }
        });
    };

    const handleSaveActivity = async (activityToSave: any) => {
        onSetIsActionLoading(true);
        try {
            let updatedProject;
            let success = false;
            if (activityToSave.id) { // Update
                const { data, error } = await supabase.from('activities').update(activityToSave).eq('id', activityToSave.id).select().single();
                handleSupabaseError(error, 'updating activity');
                if (data) {
                    updatedProject = {
                        ...project,
                        activities: project.activities.map((a:any) => a.id === data.id ? data : a)
                    };
                    success = true;
                } else {
                     onRequestAlert({
                        title: 'خطا در بروزرسانی',
                        message: `اطلاعات فعالیت بروزرسانی نشد. لطفا دوباره تلاش کنید.`
                    });
                }
            } else { // Insert
                const newActivityPayload = { 
                    ...activityToSave, 
                    project_id: project.id,
                    status: 'شروع نشده',
                    history: [],
                    kanban_order: Date.now()
                };
                delete newActivityPayload.id;
                const { data, error } = await supabase.from('activities').insert(newActivityPayload).select().single();
                handleSupabaseError(error, 'creating new activity');
                if (data) {
                    updatedProject = {
                        ...project,
                        activities: [...project.activities, data]
                    };
                    success = true;
                } else {
                    onRequestAlert({
                        title: 'خطا در ذخیره‌سازی',
                        message: `اطلاعات فعالیت ذخیره نشد. لطفا دوباره تلاش کنید.`
                    });
                }
            }
            
            if (success && updatedProject) {
                setProject(updatedProject);
                onUpdateProject(updatedProject);
                setIsActivityModalOpen(false);
                setActiveTab('activities');
            }
        } catch(e: any) {
            onRequestAlert({
                title: 'خطا در ذخیره‌سازی',
                message: `اطلاعات فعالیت ذخیره نشد. لطفا دوباره تلاش کنید. (${e.message})`
            });
        } finally {
            onSetIsActionLoading(false);
        }
    };
    
    if (!isOpen) {
        return null;
    }

    const modalTitle = projectToEdit?.isNew ? 'تعریف پروژه جدید' : `ویرایش پروژه: ${project.title}`;
    const isOwner = currentUser?.username === project.owner;


    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content project-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{modalTitle}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="tabs-container">
                        <button className={`tab-button ${activeTab === 'main' ? 'active' : ''}`} onClick={() => setActiveTab('main')}>اطلاعات اصلی پروژه</button>
                        <button className={`tab-button ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')} disabled={project.isNew}>فعالیت‌های پروژه</button>
                    </div>
                    
                    {activeTab === 'main' && (
                        <div className="tab-content" style={{ backgroundColor: 'transparent', padding: '12px 0' }}>
                            <form id="project-form" className="project-form" onSubmit={handleSave}>
                                <div className="form-header">
                                   <h3>مشخصات کلی پروژه</h3>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="projectTitle">نام پروژه</label>
                                    <input name="title" id="projectTitle" value={project.title} onChange={handleChange} required disabled={readOnly} />
                                </div>
                                <div className="input-group">
                                    <label htmlFor="owner">مالک</label>
                                    <input 
                                        id="owner"
                                        value={userMap.get(project.owner) || project.owner}
                                        disabled
                                    />
                                </div>
                                <div className="input-group">
                                    <label htmlFor="projectManager">مدیر پروژه</label>
                                    <select name="projectManager" id="projectManager" value={project.projectManager} onChange={handleChange} required disabled={readOnly || (!isOwner && !project.isNew)}>
                                        <option value="" disabled>یک مدیر انتخاب کنید</option>
                                        {projectManagers.map(user => <option key={user.username} value={user.username}>{userMap.get(user.username) || user.username}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="unit">بخش</label>
                                    <select name="unit" id="unit" value={project.unit} onChange={handleChange} required disabled={readOnly}>
                                        <option value="" disabled>یک بخش انتخاب کنید</option>
                                        {sections.map(section => <option key={section} value={section}>{section}</option>)}
                                    </select>
                                </div>
                                 <div className="input-group">
                                    <label htmlFor="priority">درجه اهمیت</label>
                                    <select name="priority" id="priority" value={project.priority} onChange={handleChange} required disabled={readOnly}>
                                        <option value="کم">کم</option>
                                        <option value="متوسط">متوسط</option>
                                        <option value="زیاد">زیاد</option>
                                    </select>
                                </div>
                                 <div className="input-group">
                                    <label htmlFor="status">وضعیت پروژه</label>
                                    <input name="status" id="status" value={project.status || 'شروع نشده'} disabled />
                                </div>
                                <div className="input-group">
                                    <label htmlFor="projectStartDate">تاریخ شروع</label>
                                    <JalaliDatePicker name="projectStartDate" id="projectStartDate" value={project.projectStartDate} onChange={handleChange} required disabled={readOnly} />
                                </div>
                                <div className="input-group">
                                    <label htmlFor="projectEndDate">تاریخ پایان</label>
                                    <JalaliDatePicker name="projectEndDate" id="projectEndDate" value={project.projectEndDate} onChange={handleChange} required disabled={readOnly} />
                                </div>
                                <div className="input-group full-width">
                                    <label htmlFor="projectGoal">هدف پروژه</label>
                                    <textarea name="projectGoal" id="projectGoal" rows={4} value={project.projectGoal} onChange={handleChange} disabled={readOnly} />
                                </div>
                                <div className="input-group full-width" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="checkbox" 
                                        name="use_workflow" 
                                        id="project-use_workflow" 
                                        checked={project.use_workflow} 
                                        onChange={e => setProject(prev => ({ ...prev, use_workflow: e.target.checked }))}
                                        disabled={readOnly} 
                                        style={{ width: 'auto' }}
                                    />
                                    <label htmlFor="project-use_workflow" style={{ marginBottom: 0, userSelect: 'none' }}>استفاده از گردش کار تاییدات</label>
                                </div>
                            </form>
                        </div>
                    )}
                    
                    {activeTab === 'activities' && (
                        <div className="tab-content" style={{ backgroundColor: 'transparent', padding: '12px 0' }}>
                            <div className="activities-header">
                                <h3>لیست فعالیت‌ها</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div className="filter-group" style={{ margin: 0, minWidth: '180px' }}>
                                        <select 
                                            id="activity-status-filter" 
                                            className="status-select" 
                                            value={activityStatusFilter} 
                                            onChange={e => setActivityStatusFilter(e.target.value)}
                                            style={{width: '100%', height: 'auto', padding: '0.5rem'}}
                                            aria-label="فیلتر وضعیت فعالیت‌ها"
                                        >
                                            <option value="active">جاری و شروع نشده</option>
                                            <option value="all">همه</option>
                                            <option value="شروع نشده">شروع نشده</option>
                                            <option value="در حال اجرا">در حال اجرا</option>
                                            <option value="خاتمه یافته">خاتمه یافته</option>
                                        </select>
                                    </div>
                                    {canManageActivities && (
                                         <button className="add-activity-btn" onClick={handleAddActivity}>
                                            افزودن فعالیت
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="table-wrapper">
                                <table className="user-list-table activities-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>عنوان</th>
                                            <th>اهمیت</th>
                                            <th>وضعیت</th>
                                            <th>عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                       {filteredActivities.length > 0 ? filteredActivities.map((activity: any, index: number) => {
                                            const displayStatus = activity.status === 'ارسال برای تایید' ? activity.underlyingStatus : activity.status;
                                            return (
                                               <tr key={activity.id}>
                                                   <td>
                                                        <div className="title-cell-content" style={{ justifyContent: 'center' }}>
                                                            <span>{toPersianDigits(index + 1)}</span>
                                                            {activity.status === 'خاتمه یافته' ? (
                                                                <span className="completed-indicator" title="تکمیل شده">
                                                                    <ApproveIcon />
                                                                </span>
                                                            ) : (
                                                                <span 
                                                                    className={`delay-indicator-dot ${isDelayed(activity.status, activity.endDate) ? 'delayed' : 'on-time'}`}
                                                                    title={isDelayed(activity.status, activity.endDate) ? 'دارای تاخیر' : 'فاقد تاخیر'}
                                                                ></span>
                                                            )}
                                                        </div>
                                                   </td>
                                                   <td>{activity.title}</td>
                                                   <td>{renderPriorityBadge(activity.priority)}</td>
                                                   <td>
                                                        {displayStatus}
                                                    </td>
                                                   <td>
                                                        <div className="action-buttons-grid">
                                                            <div className="action-buttons-row">
                                                                <button className="icon-btn details-btn" title="جزئیات" onClick={() => handleViewActivityDetails(activity)}>
                                                                    <DetailsIcon />
                                                                </button>
                                                                {canManageActivities && (
                                                                    <button className="icon-btn edit-btn" title="ویرایش" onClick={() => handleEditActivity(activity)}>
                                                                        <EditIcon />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="action-buttons-row">
                                                                {canManageActivities && (
                                                                    <button className="icon-btn delete-btn" title="حذف" onClick={() => handleDeleteActivity(activity.id)}>
                                                                        <DeleteIcon />
                                                                    </button>
                                                                )}
                                                                <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(activity.history)}>
                                                                    <HistoryIcon />
                                                                </button>
                                                            </div>
                                                        </div>
                                                   </td>
                                               </tr>
                                           )
                                       }) : (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center' }}>فعالیتی با این فیلتر یافت نشد.</td>
                                        </tr>
                                       )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                 <div className="modal-footer">
                    {activeTab === 'main' && !readOnly ? (
                        <>
                            <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                            <button type="submit" form="project-form" className="save-btn">{project.isNew ? 'ایجاد و ادامه' : 'ذخیره پروژه'}</button>
                        </>
                    ) : (
                        <button type="button" className="cancel-btn" onClick={onClose}>بستن</button>
                    )}
                </div>
                <ActivityModal 
                    isOpen={isActivityModalOpen}
                    onClose={() => setIsActivityModalOpen(false)}
                    onSave={handleSaveActivity}
                    activityToEdit={editingActivity}
                    users={users}
                    onRequestAlert={onRequestAlert}
                    isProjectOwner={canManageActivities}
                    responsibleUsers={activityResponsibleUsers}
                    approverUsers={activityApproverUsers}
                    currentUser={currentUser}
                    projectUseWorkflow={project.use_workflow}
                />
            </div>
        </div>
    );
};