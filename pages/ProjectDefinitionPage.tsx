/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import moment from 'moment-jalaali';
import { User, TeamMember } from '../types';
import { getTodayString } from '../constants';
import { supabase, handleSupabaseError } from '../supabaseClient';
import { EditIcon, DeleteIcon, HistoryIcon } from '../icons';
// FIX: Corrected import path to avoid conflict with empty modals.tsx file.
import { ActivityModal } from '../modals/index';

export const ProjectDefinitionPage = ({ users, sections, onSave, projectToEdit, onRequestConfirmation, onShowHistory, currentUser, teamMembers, onUpdateProject }: {
    users: User[];
    sections: string[];
    onSave: (project: any) => void;
    projectToEdit: any;
    projects: any[];
    onRequestConfirmation: (props: any) => void;
    onShowHistory: (history: any[]) => void;
    currentUser: User | null;
    teamMembers: TeamMember[];
    onUpdateProject: (project: any) => void;
}) => {
    const initialProjectState = {
        projectName: '', projectManager: '', unit: sections[0] || '', priority: 'متوسط',
        projectStartDate: getTodayString(), projectEndDate: getTodayString(), projectGoal: '',
        activities: [],
        owner: '',
        isNew: false,
        status: 'شروع نشده',
        id: null
    };
    const [project, setProject] = useState(initialProjectState);
    const [activeTab, setActiveTab] = useState('main'); // main or activities
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);

    const { readOnly = false } = projectToEdit || {};
    
    const possibleOwners = useMemo(() => {
        if (!currentUser) return [];
        const ownerList = [{ username: currentUser.username }, ...teamMembers];
        const uniqueOwners = Array.from(new Set(ownerList.map(u => u.username)))
                                 .map(username => ({ username }));
        return uniqueOwners;
    }, [currentUser, teamMembers]);
    
    const projectManagers = teamMembers.filter(m => m.role !== 'عضو تیم');

    useEffect(() => {
        if (projectToEdit) {
            const ownerToSet = projectToEdit.owner || (currentUser ? currentUser.username : '');
            setProject({ ...initialProjectState, ...projectToEdit, owner: ownerToSet });

            if (projectToEdit.initialTab) {
                setActiveTab(projectToEdit.initialTab);
            } else if (projectToEdit.isNew) {
                setActiveTab('main');
            }
        } else {
            setProject({...initialProjectState, owner: currentUser!.username });
        }
    }, [projectToEdit, currentUser, sections]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProject(prev => ({ ...prev, [name]: value }));
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

    const handleDeleteActivity = (activityId: number) => {
         const activityToDelete = project.activities.find((a:any) => a.id === activityId);
         onRequestConfirmation({
            title: 'حذف فعالیت',
            message: `آیا از حذف فعالیت "${activityToDelete?.title}" اطمینان دارید؟`,
            onConfirm: async () => {
                const { error } = await supabase.from('activities').delete().eq('id', activityId);
                handleSupabaseError(error, 'deleting activity');
                if (!error) {
                    const updatedActivities = project.activities.filter((a:any) => a.id !== activityId);
                    const updatedProject = { ...project, activities: updatedActivities };
                    setProject(updatedProject);
                    onUpdateProject(updatedProject);
                }
            }
        });
    };

    const handleSaveActivity = async (activityToSave: any) => {
        let updatedProject;
        if (activityToSave.id) { // Update
            const { data, error } = await supabase.from('activities').update(activityToSave).eq('id', activityToSave.id).select().single();
            handleSupabaseError(error, 'updating activity');
            if (data) {
                updatedProject = {
                    ...project,
                    activities: project.activities.map((a:any) => a.id === data.id ? data : a)
                };
            }
        } else { // Insert
            const newActivityPayload = { 
                ...activityToSave, 
                project_id: project.id,
                status: 'شروع نشده',
                history: []
            };
            delete newActivityPayload.id;
            const { data, error } = await supabase.from('activities').insert(newActivityPayload).select().single();
            handleSupabaseError(error, 'creating new activity');
            if (data) {
                updatedProject = {
                    ...project,
                    activities: [...project.activities, data]
                };
            }
        }
        
        if (updatedProject) {
            setProject(updatedProject);
            onUpdateProject(updatedProject);
        }

        setIsActivityModalOpen(false);
        setActiveTab('activities');
    };

    return (
        <div className="project-definition-page">
            <div className="tabs-container">
                <button className={`tab-button ${activeTab === 'main' ? 'active' : ''}`} onClick={() => setActiveTab('main')}>اطلاعات اصلی پروژه</button>
                <button className={`tab-button ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')} disabled={project.isNew}>فعالیت‌های پروژه</button>
            </div>
            
            {activeTab === 'main' && (
                <div className="tab-content">
                    <form className="project-form" onSubmit={handleSave}>
                        <div className="form-header">
                           <h3>مشخصات کلی پروژه</h3>
                        </div>
                        <div className="input-group">
                            <label htmlFor="projectName">نام پروژه</label>
                            <input name="projectName" id="projectName" value={project.projectName} onChange={handleChange} required disabled={readOnly} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="owner">مالک</label>
                            <select name="owner" id="owner" value={project.owner} onChange={handleChange} required disabled={readOnly}>
                                <option value="" disabled>یک مالک انتخاب کنید</option>
                                {possibleOwners.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label htmlFor="projectManager">مدیر پروژه</label>
                            <select name="projectManager" id="projectManager" value={project.projectManager} onChange={handleChange} required disabled={readOnly}>
                                <option value="" disabled>یک مدیر انتخاب کنید</option>
                                {projectManagers.map(user => <option key={user.username} value={user.username}>{user.username}</option>)}
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
                            <input type="date" name="projectStartDate" id="projectStartDate" value={project.projectStartDate} onChange={handleChange} required disabled={readOnly} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="projectEndDate">تاریخ پایان</label>
                            <input type="date" name="projectEndDate" id="projectEndDate" value={project.projectEndDate} onChange={handleChange} required disabled={readOnly} />
                        </div>
                        <div className="input-group full-width">
                            <label htmlFor="projectGoal">هدف پروژه</label>
                            <textarea name="projectGoal" id="projectGoal" rows={4} value={project.projectGoal} onChange={handleChange} disabled={readOnly} />
                        </div>

                        {!readOnly && (
                             <div className="modal-footer full-width" style={{ border: 'none', padding: '16px 0 0 0' }}>
                                <button type="submit" className="save-btn">ذخیره پروژه</button>
                            </div>
                        )}
                    </form>
                </div>
            )}
            
            {activeTab === 'activities' && (
                <div className="tab-content">
                    <div className="activities-header">
                        <h3>لیست فعالیت‌ها</h3>
                        {!readOnly && (
                             <button className="add-activity-btn" onClick={handleAddActivity}>
                                افزودن فعالیت
                            </button>
                        )}
                    </div>
                    <table className="user-list-table">
                        <thead>
                            <tr>
                                <th>عنوان</th>
                                <th>تاریخ شروع</th>
                                <th>تاریخ پایان</th>
                                <th>مسئول</th>
                                <th>تایید کننده</th>
                                <th>وضعیت</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                           {(project.activities || []).map((activity: any) => (
                               <tr key={activity.id}>
                                   <td>{activity.title}</td>
                                   <td>{moment(activity.startDate).format('jYYYY/jMM/jDD')}</td>
                                   <td>{moment(activity.endDate).format('jYYYY/jMM/jDD')}</td>
                                   <td>{activity.responsible}</td>
                                   <td>{activity.approver}</td>
                                   <td>{activity.status}</td>
                                   <td>
                                        <div className="action-buttons">
                                            {!readOnly && (
                                                <>
                                                    <button className="icon-btn edit-btn" title="ویرایش" onClick={() => handleEditActivity(activity)}>
                                                        <EditIcon />
                                                    </button>
                                                    <button className="icon-btn delete-btn" title="حذف" onClick={() => handleDeleteActivity(activity.id)}>
                                                        <DeleteIcon />
                                                    </button>
                                                </>
                                            )}
                                            <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(activity.history)}>
                                                <HistoryIcon />
                                            </button>
                                        </div>
                                   </td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                </div>
            )}
            <ActivityModal 
                isOpen={isActivityModalOpen}
                onClose={() => setIsActivityModalOpen(false)}
                onSave={handleSaveActivity}
                activityToEdit={editingActivity}
                teamMembers={teamMembers}
            />
        </div>
    );
};