/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, FormEvent, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import moment from 'moment-jalaali';
import { User, TeamMember, TeamMemberRole } from './types';
import { menuItems } from './constants';
import { supabase, handleSupabaseError, isSupabaseConfigured } from './supabaseClient';
import { PlusIcon } from './icons';

// FIX: Corrected import path to avoid conflict with empty pages.tsx file.
import { 
    LoginPage, 
    UserManagementPage, 
    ProjectDefinitionPage, 
    ProjectsActionsListPage, 
    TasksPage, 
    ApprovalsPage,
    SettingsPage,
    DashboardPage,
    MyTeamPage
} from './pages/index';
// FIX: Corrected import path to avoid conflict with empty modals.tsx file.
import { 
    ActionModal, 
    DetailsModal, 
    HistoryModal, 
    ConfirmationModal, 
    ChoiceModal,
    UserEditModal,
    ApprovalInfoModal,
    ApprovalDecisionModal
} from './modals/index';

moment.loadPersian({ usePersianDigits: true });

const App = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [view, setView] = useState('login'); // login, dashboard, users, etc.
    const [contentTitle, setContentTitle] = useState('ورود به سامانه');

    const [projects, setProjects] = useState<any[]>([]);
    const [actions, setActions] = useState<any[]>([]);
    
    // Settings State
    const [theme, setTheme] = useState('dark');
    const [sections, setSections] = useState<string[]>([]);

    // Team Management State
    const [teams, setTeams] = useState<Record<string, TeamMember[]>>({});

    const [editingProject, setEditingProject] = useState<any | null>(null);
    const [editingAction, setEditingAction] = useState<any | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    
    const [detailsItem, setDetailsItem] = useState<any | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    
    const [infoItem, setInfoItem] = useState<any | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    const [history, setHistory] = useState<any[]>([]);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [confirmationProps, setConfirmationProps] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [approvalDecisionProps, setApprovalDecisionProps] = useState({ isOpen: false, item: null, decision: '' });

    const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
    
    const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!isSupabaseConfigured) {
                setError('پیکربندی Supabase انجام نشده است. لطفاً فایل supabaseClient.ts را با اطلاعات پروژه خود به‌روزرسانی کنید.');
                setIsLoading(false);
                return;
            }

            try {
                const [usersRes, projectsRes, actionsRes, sectionsRes, teamsRes] = await Promise.all([
                    supabase.from('users').select('*'),
                    supabase.from('projects').select('*, activities(*)').order('id', { foreignTable: 'activities' }),
                    supabase.from('actions').select('*'),
                    supabase.from('units').select('name'),
                    supabase.from('teams').select('*')
                ]);

                handleSupabaseError(usersRes.error, 'fetching users');
                setUsers(usersRes.data || []);

                handleSupabaseError(projectsRes.error, 'fetching projects');
                setProjects(projectsRes.data || []);

                handleSupabaseError(actionsRes.error, 'fetching actions');
                setActions(actionsRes.data || []);

                handleSupabaseError(sectionsRes.error, 'fetching sections');
                setSections((sectionsRes.data || []).map(u => u.name));

                handleSupabaseError(teamsRes.error, 'fetching teams');
                const teamsData = teamsRes.data || [];
                const reconstructedTeams = teamsData.reduce((acc, team) => {
                    if (!acc[team.manager_username]) {
                        acc[team.manager_username] = [];
                    }
                    acc[team.manager_username].push({ username: team.member_username, role: team.role });
                    return acc;
                }, {});
                setTeams(reconstructedTeams);

            } catch (e: any) {
                setError(`Failed to load application data: ${e.message}. Please check your network connection and Supabase configuration in supabaseClient.ts.`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        document.body.className = theme === 'light' ? 'theme-light' : '';
    }, [theme]);

    const calculateProjectStatus = (project: any) => {
        const activities = project.activities;
        if (!activities || activities.length === 0) {
            return 'شروع نشده';
        }

        const isActivityComplete = (act: any) => {
            // If workflow is disabled for the project, completion only depends on status.
            if (project.use_workflow === false) {
                return act.status === 'خاتمه یافته';
            }
            // If workflow is enabled, it needs approval.
            return act.status === 'خاتمه یافته' && act.approvalStatus === 'approved';
        };

        const allCompleted = activities.every(isActivityComplete);
        if (allCompleted) {
            return 'خاتمه یافته';
        }

        const isActivityActive = (act: any) => {
            if (project.use_workflow === false) {
                return act.status === 'در حال اجرا' || act.status === 'خاتمه یافته';
            }
            // For workflow-enabled projects, 'active' means it was approved to start, or it's already complete.
            return (act.status === 'در حال اجرا' && act.approvalStatus === 'approved') || isActivityComplete(act);
        };
        
        const anyActive = activities.some(isActivityActive);
        if (anyActive) {
            return 'در حال اجرا';
        }

        return 'شروع نشده';
    };

    useEffect(() => {
        const projectsWithUpdatedStatus = projects.map(project => {
            if (!project.activities) return project;
            
            const newStatus = calculateProjectStatus(project);
            if (project.status !== newStatus) {
                // Also update in DB
                supabase.from('projects').update({ status: newStatus }).eq('id', project.id).then(({ error }) => {
                     handleSupabaseError(error, 'updating project status');
                });
                return { ...project, status: newStatus };
            }
            return project;
        });

        if (JSON.stringify(projects) !== JSON.stringify(projectsWithUpdatedStatus)) {
            setProjects(projectsWithUpdatedStatus);
        }
    }, [projects]);


    const handleRequestConfirmation = ({ title, message, onConfirm }) => {
        setConfirmationProps({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                handleCloseConfirmation();
            }
        });
    };

    const handleCloseConfirmation = () => {
        setConfirmationProps({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    };

    const handleRequestApprovalDecision = (item, decision) => {
        setApprovalDecisionProps({ isOpen: true, item, decision });
    };
    
    const handleCloseApprovalDecision = () => {
        setApprovalDecisionProps({ isOpen: false, item: null, decision: '' });
    };

    const handleConfirmApprovalDecision = (comment) => {
        const { item, decision } = approvalDecisionProps;
        if (item && decision) {
            updateItemStatus(item.id, item.type, decision, { comment });
        }
        handleCloseApprovalDecision();
    };

    const handleLogin = (user) => {
        setLoggedInUser(user);
        setTheme(user.theme || 'dark');
        setView('dashboard');
        setContentTitle('داشبورد من');
    };
    
    const handleLogout = () => {
        setLoggedInUser(null);
        setView('login');
        setContentTitle('ورود به سامانه');
    };

    const handleSignUp = async ({ username, password, fullName }) => {
        setIsActionLoading(true);
        try {
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .single();

            if (existingUser) {
                return { error: { message: 'نام کاربری قبلا استفاده شده است.' } };
            }
            
            if (!password || password.length < 6) {
                 return { error: { message: 'رمز عبور باید حداقل ۶ کارکتر باشد.' } };
            }

            const { data, error } = await supabase
                .from('users')
                .insert([{ username, password_hash: password, full_name: fullName, role: 'تیم پروژه', is_active: true, theme: 'dark' }])
                .select()
                .single();

            if (error) {
                 console.error(`Error in signing up user:`, error.message)
                 return { error };
            }

            if (data) {
                setUsers(prev => [...prev, data]);
            }
            return { data };
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const handleMenuClick = (id: string, name: string) => {
        if (id === 'define_new') {
            handleDefineNew();
        } else {
             setView(id);
             setContentTitle(name);
        }
    };
    
    const handleAddUser = async ({ username, password, fullName }) => {
        setIsActionLoading(true);
        try {
            const { data, error } = await supabase.from('users').insert([{ username, password_hash: password, full_name: fullName, role: 'تیم پروژه', is_active: true }]).select().single();
            handleSupabaseError(error, 'adding user');
            if (data) {
                setUsers(prev => [...prev, data]);
            }
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const handleDeleteUser = (userId: number) => {
        const userToDelete = users.find(u => u.id === Number(userId));
        if (userToDelete?.username === 'mahmoudi.pars@gmail.com') {
            alert('این کاربر قابل حذف نیست.');
            return;
        }
        handleRequestConfirmation({
            title: 'حذف کاربر',
            message: `آیا از حذف کاربر "${userToDelete?.username}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`,
            onConfirm: async () => {
                setIsActionLoading(true);
                try {
                     const { error } = await supabase.from('users').delete().eq('id', userId);
                     handleSupabaseError(error, 'deleting user');
                     if (!error) {
                        setUsers(prev => prev.filter(u => u.id !== userId));
                     }
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
    };
    
    const handleToggleUserActive = async (userId: number) => {
        setIsActionLoading(true);
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const newStatus = !user.is_active;
            const { error } = await supabase.from('users').update({ is_active: newStatus }).eq('id', userId);
            handleSupabaseError(error, 'toggling user active status');
            if (!error) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: newStatus } : u));
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEditUser = (userId: number) => {
        const userToEdit = users.find(u => u.id === userId);
        if (userToEdit) {
            setEditingUser(userToEdit);
            setIsUserEditModalOpen(true);
        }
    };

    const handleUpdateUser = async (updatedUser: User & { new_password?: string }) => {
        setIsActionLoading(true);
        try {
            const payload: { password_hash?: string, full_name: string } = {
                full_name: updatedUser.full_name
            };
            if (updatedUser.new_password && updatedUser.new_password.length > 0) {
                payload.password_hash = updatedUser.new_password;
            }
            const { data, error } = await supabase.from('users').update(payload).eq('id', updatedUser.id).select().single();
            handleSupabaseError(error, 'updating user');
            if (data) {
                setUsers(prev => prev.map(u => u.id === data.id ? data : u));
            }
        } finally {
            setIsActionLoading(false);
            setIsUserEditModalOpen(false);
            setEditingUser(null);
        }
    };
    
    const handleThemeChange = async (newTheme: string) => {
        if (!loggedInUser) return;
        setIsActionLoading(true);
        try {
            setTheme(newTheme);
            const { data, error } = await supabase.from('users').update({ theme: newTheme }).eq('id', loggedInUser.id).select().single();
            handleSupabaseError(error, 'updating theme');
            if (data) {
                setLoggedInUser(data);
            }
        } catch(e) {
            console.error('Failed to update theme', e);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDefineNew = () => {
        setIsChoiceModalOpen(true);
    };

    const handleChooseProject = () => {
        setEditingProject({ isNew: true, activities: [] });
        setIsProjectModalOpen(true);
        setIsChoiceModalOpen(false);
    };

    const handleChooseAction = () => {
        setEditingAction(null);
        setIsActionModalOpen(true);
        setIsChoiceModalOpen(false);
    };

    const handleSaveProject = async (projectToSave) => {
        setIsActionLoading(true);
        try {
            if (projectToSave.isNew) {
                const { activities, isNew, ...newProjectPayload } = projectToSave;
                newProjectPayload.owner = newProjectPayload.owner || loggedInUser.username;
                delete newProjectPayload.id; // Ensure ID is not sent for new records
                const { data, error } = await supabase.from('projects').insert(newProjectPayload).select().single();
                handleSupabaseError(error, 'creating new project');
                if (data) {
                    const newProject = { ...data, activities: [] };
                    setProjects(prev => [...prev, newProject]);
                    setEditingProject({ ...newProject, initialTab: 'activities' });
                }
            } else {
                const { activities, type, readOnly, initialTab, isNew, ...updatePayload } = projectToSave;
                const { data, error } = await supabase.from('projects').update(updatePayload).eq('id', projectToSave.id).select().single();
                handleSupabaseError(error, 'updating project');
                if (data) {
                    const updatedProject = { ...data, activities: projectToSave.activities };
                    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
                    setIsProjectModalOpen(false);
                    setEditingProject(null);
                }
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSaveAction = async (actionToSave) => {
        setIsActionLoading(true);
        try {
            if (actionToSave.id) { // Update
                const { type, parentName, ...updatePayload } = actionToSave;
                const { data, error } = await supabase.from('actions').update(updatePayload).eq('id', actionToSave.id).select().single();
                handleSupabaseError(error, 'updating action');
                if (data) {
                    setActions(prev => prev.map(a => a.id === data.id ? data : a));
                }
            } else { // Insert
                const newActionPayload = { ...actionToSave, owner: actionToSave.owner || loggedInUser.username, history: [{ status: actionToSave.status, user: loggedInUser.username, date: new Date().toISOString() }] };
                delete newActionPayload.id;
                const { data, error } = await supabase.from('actions').insert(newActionPayload).select().single();
                handleSupabaseError(error, 'creating new action');
                if (data) {
                    setActions(prev => [...prev, data]);
                }
            }
        } finally {
            setIsActionLoading(false);
            setIsActionModalOpen(false);
            setEditingAction(null);
        }
    };
    
    const handleEditProject = (project, isReadOnly = false) => {
        setEditingProject({ ...project, readOnly: isReadOnly });
        setIsProjectModalOpen(true);
    }

    const handleDeleteProject = (projectId) => {
        const projectToDelete = projects.find(p => p.id === projectId);
        handleRequestConfirmation({
            title: 'حذف پروژه',
            message: `آیا از حذف پروژه "${projectToDelete?.title}" اطمینان دارید؟ این عمل تمام فعالیت‌های آن را نیز حذف خواهد کرد.`,
            onConfirm: async () => {
                setIsActionLoading(true);
                try {
                    const { error } = await supabase.from('projects').delete().eq('id', projectId);
                    handleSupabaseError(error, 'deleting project');
                    if (!error) {
                        setProjects(prev => prev.filter(p => p.id !== projectId));
                    }
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
    };

    const handleEditAction = (action) => {
        setEditingAction(action);
        setIsActionModalOpen(true);
    };

    const handleDeleteAction = (actionId) => {
        const actionToDelete = actions.find(a => a.id === actionId);
        handleRequestConfirmation({
            title: 'حذف اقدام',
            message: `آیا از حذف اقدام "${actionToDelete?.title}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`,
            onConfirm: async () => {
                setIsActionLoading(true);
                try {
                    const { error } = await supabase.from('actions').delete().eq('id', actionId);
                    handleSupabaseError(error, 'deleting action');
                    if (!error) {
                        setActions(prev => prev.filter(a => a.id !== actionId));
                    }
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
    };

    const handleViewDetails = (item) => {
        setDetailsItem(item);
        setIsDetailsModalOpen(true);
    };
    
    const handleShowInfo = (item) => {
        setInfoItem(item);
        setIsInfoModalOpen(true);
    };

    const updateItemStatus = async (itemId, itemType, newStatus, extraData = {}) => {
        setIsActionLoading(true);
        try {
            const isActivity = itemType === 'activity';
            const tableName = isActivity ? 'activities' : 'actions';

            let itemToUpdate, parentProject;
            if (isActivity) {
                for (const p of projects) {
                    const found = p.activities.find(a => a.id === itemId);
                    if (found) { 
                        itemToUpdate = found;
                        parentProject = p;
                        break;
                    }
                }
            } else {
                itemToUpdate = actions.find(a => a.id === itemId);
            }
            if (!itemToUpdate) return;
            
            let finalStatus = newStatus;
            const historyEntry: any = { user: loggedInUser.username, date: new Date().toISOString(), ...extraData };
            let newApprovalStatus = undefined;
            const isApprovalDecision = newStatus === 'approved' || newStatus === 'rejected';

            const updatePayload: any = {};

            if (newStatus === 'approved') {
                finalStatus = itemToUpdate.requestedStatus;
                historyEntry.approvalDecision = 'approved';
                newApprovalStatus = 'approved';
            } else if (newStatus === 'rejected') {
                finalStatus = itemToUpdate.underlyingStatus;
                historyEntry.approvalDecision = 'rejected';
                newApprovalStatus = 'rejected';
            }
            historyEntry.status = finalStatus;
            updatePayload.status = finalStatus;
            updatePayload.history = [...(itemToUpdate.history || []), historyEntry];

            if (isApprovalDecision) {
                updatePayload.requestedStatus = null;
                updatePayload.underlyingStatus = null;
                updatePayload.approvalStatus = newApprovalStatus;
            } else {
                updatePayload.approvalStatus = null;
            }

            const { data, error } = await supabase.from(tableName).update(updatePayload).eq('id', itemId).select().single();
            handleSupabaseError(error, 'updating item status');
            
            if (!error && data) {
                if (isActivity) {
                    const updatedActivities = parentProject.activities.map(act => act.id === itemId ? data : act);
                    const updatedProject = { ...parentProject, activities: updatedActivities };
                    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
                } else {
                    setActions(prev => prev.map(act => act.id === itemId ? data : act));
                }
            }
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const handleSendForApproval = async (itemToUpdate, requestedStatus, extraData = {}) => {
        setIsActionLoading(true);
        try {
            const isActivity = itemToUpdate.type === 'activity';
            const tableName = isActivity ? 'activities' : 'actions';

            const historyEntry = {
                status: 'ارسال برای تایید',
                user: loggedInUser.username,
                date: new Date().toISOString(),
                requestedStatus,
                ...extraData
            };

            const updatePayload = {
                underlyingStatus: itemToUpdate.status,
                status: 'ارسال برای تایید',
                requestedStatus: requestedStatus,
                approvalStatus: null,
                history: [...(itemToUpdate.history || []), historyEntry]
            };
            
            const { data, error } = await supabase.from(tableName).update(updatePayload).eq('id', itemToUpdate.id).select().single();
            handleSupabaseError(error, 'sending for approval');
            
            if (!error && data) {
                if (isActivity) {
                    setProjects(prevProjects => prevProjects.map(p => ({
                        ...p,
                        activities: p.activities.map(act => act.id === itemToUpdate.id ? data : act)
                    })));
                } else {
                    setActions(prev => prev.map(act => act.id === itemToUpdate.id ? data : act));
                }
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDirectStatusUpdate = async (itemId: number, itemType: string, newStatus: string) => {
        setIsActionLoading(true);
        try {
            const isActivity = itemType === 'activity';
            const tableName = isActivity ? 'activities' : 'actions';
    
            let itemToUpdate: any, parentProject: any;
            if (isActivity) {
                for (const p of projects) {
                    const found = p.activities.find((a: any) => a.id === itemId);
                    if (found) {
                        itemToUpdate = found;
                        parentProject = p;
                        break;
                    }
                }
            } else {
                itemToUpdate = actions.find(a => a.id === itemId);
            }
    
            if (!itemToUpdate) return;
    
            const historyEntry = {
                user: loggedInUser!.username,
                date: new Date().toISOString(),
                status: newStatus,
                details: `وضعیت به صورت دستی به "${newStatus}" تغییر یافت.`
            };
    
            const updatePayload = {
                status: newStatus,
                history: [...(itemToUpdate.history || []), historyEntry]
            };
    
            const { data, error } = await supabase.from(tableName).update(updatePayload).eq('id', itemId).select().single();
            handleSupabaseError(error, 'updating status directly');
            
            if (!error && data) {
                if (isActivity) {
                    const updatedActivities = parentProject.activities.map((act: any) => act.id === itemId ? data : act);
                    const updatedProject = { ...parentProject, activities: updatedActivities };
                    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
                } else {
                    setActions(prev => prev.map(act => act.id === itemId ? data : act));
                }
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelegateTask = async (itemToDelegate, newResponsibleUsername) => {
        setIsActionLoading(true);
        try {
            const isActivity = itemToDelegate.type === 'activity';
            const tableName = isActivity ? 'activities' : 'actions';

            const historyEntry = {
                status: 'واگذار شد',
                user: loggedInUser.username,
                date: new Date().toISOString(),
                details: `مسئولیت از ${itemToDelegate.responsible} به ${newResponsibleUsername} واگذار شد.`
            };

            const updatePayload = {
                responsible: newResponsibleUsername,
                history: [...(itemToDelegate.history || []), historyEntry]
            };

            const { data, error } = await supabase.from(tableName).update(updatePayload).eq('id', itemToDelegate.id).select().single();
            handleSupabaseError(error, 'delegating task');

            if (!error && data) {
                if (isActivity) {
                    setProjects(prev => prev.map(p => ({
                        ...p,
                        activities: p.activities.map(act => act.id === itemToDelegate.id ? data : act)
                    })));
                } else {
                    setActions(prev => prev.map(act => act.id === itemToDelegate.id ? data : act));
                }
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleMassDelegateTasks = async (updates: Array<{ itemId: number; itemType: string; newResponsible: string }>) => {
        setIsActionLoading(true);
        try {
            const updatePromises = updates.map(async (update) => {
                const isActivity = update.itemType === 'activity';
                const tableName = isActivity ? 'activities' : 'actions';
                
                const { data: item } = await supabase.from(tableName).select('responsible, history').eq('id', update.itemId).single();
                if (!item) return null;

                const historyEntry = {
                    status: 'واگذار شد',
                    user: loggedInUser.username,
                    date: new Date().toISOString(),
                    details: `مسئولیت از ${item.responsible} به ${update.newResponsible} واگذار شد.`
                };

                return supabase.from(tableName)
                    .update({ responsible: update.newResponsible, history: [...(item.history || []), historyEntry] })
                    .eq('id', update.itemId);
            });

            const results = await Promise.all(updatePromises);
            results.forEach(res => handleSupabaseError(res?.error, 'mass delegating tasks'));

            // Refetch projects and actions to ensure UI is consistent
            const [projectsRes, actionsRes] = await Promise.all([
                supabase.from('projects').select('*, activities(*)'),
                supabase.from('actions').select('*')
            ]);
            if (projectsRes.data) setProjects(projectsRes.data);
            if (actionsRes.data) setActions(actionsRes.data);
        } finally {
            setIsActionLoading(false);
        }
    };

    const globalApprovalHistory = React.useMemo(() => {
        if (!loggedInUser) return [];

        const allItems = [
            ...projects.flatMap(p => p.activities.map(a => ({...a, parentTitle: `${p.title} / ${a.title}`}))),
            ...actions.map(a => ({...a, parentTitle: a.title}))
        ];

        const history: any[] = [];
        allItems.forEach(item => {
            if (item.history) {
                item.history.forEach(entry => {
                    if ((entry.approvalDecision === 'approved' || entry.approvalDecision === 'rejected') && entry.user === loggedInUser.username) {
                        history.push({ ...entry, parentTitle: item.parentTitle });
                    }
                });
            }
        });
        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [projects, actions, loggedInUser]);

    const handleShowGlobalApprovalsHistory = () => {
        handleShowHistory(globalApprovalHistory);
    };

    const handleShowHistory = (historyData) => {
        setHistory(historyData);
        setIsHistoryModalOpen(true);
    };

    const handleAddSection = async (sectionName: string) => {
        setIsActionLoading(true);
        try {
            if (sectionName && !sections.includes(sectionName)) {
                const { error } = await supabase.from('units').insert({ name: sectionName });
                handleSupabaseError(error, 'adding section');
                if (!error) {
                    setSections(prev => [...prev, sectionName]);
                }
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateSection = async (oldName: string, newName: string) => {
        setIsActionLoading(true);
        try {
            if (newName && !sections.includes(newName) && oldName !== newName) {
                // Step 1: Insert the new section name into the 'units' table.
                const { error: insertError } = await supabase.from('units').insert({ name: newName });
                handleSupabaseError(insertError, 'inserting new section name');
    
                // Step 2: Update projects referencing the old section name to the new name.
                const { error: projectError } = await supabase.from('projects').update({ unit: newName }).eq('unit', oldName);
                handleSupabaseError(projectError, 'updating projects for section rename');
    
                // Step 3: Update actions referencing the old section name to the new name.
                const { error: actionError } = await supabase.from('actions').update({ unit: newName }).eq('unit', oldName);
                handleSupabaseError(actionError, 'updating actions for section rename');
                
                // Step 4: Delete the old section name from the 'units' table.
                const { error: deleteError } = await supabase.from('units').delete().eq('name', oldName);
                handleSupabaseError(deleteError, 'deleting old section name');
    
                // If all database operations are successful, update the local state.
                setSections(prev => prev.map(u => u === oldName ? newName : u));
                
                // And refetch data to ensure UI consistency.
                const [projectsRes, actionsRes] = await Promise.all([
                    supabase.from('projects').select('*, activities(*)').order('id', { foreignTable: 'activities' }),
                    supabase.from('actions').select('*')
                ]);
    
                handleSupabaseError(projectsRes.error, 'refetching projects after section update');
                if (projectsRes.data) setProjects(projectsRes.data);
                
                handleSupabaseError(actionsRes.error, 'refetching actions after section update');
                if (actionsRes.data) setActions(actionsRes.data);
            }
        } catch (e: any) {
            console.error(`Failed to update section: ${e.message}`);
            alert(`خطا در بروزرسانی بخش: ${e.message}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteSection = (sectionName: string) => {
        handleRequestConfirmation({
            title: 'حذف بخش',
            message: `آیا از حذف بخش "${sectionName}" اطمینان دارید؟`,
            onConfirm: async () => {
                setIsActionLoading(true);
                try {
                    // Check for dependencies before deleting
                    const { count: projectCount, error: pError } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('unit', sectionName);
                    handleSupabaseError(pError, 'checking projects for section');
                    
                    const { count: actionCount, error: aError } = await supabase.from('actions').select('*', { count: 'exact', head: true }).eq('unit', sectionName);
                    handleSupabaseError(aError, 'checking actions for section');
                    
                    if ((projectCount && projectCount > 0) || (actionCount && actionCount > 0)) {
                        alert(`امکان حذف بخش "${sectionName}" وجود ندارد زیرا در حال استفاده توسط یک یا چند پروژه یا اقدام است.`);
                        return;
                    }
    
                    const { error } = await supabase.from('units').delete().eq('name', sectionName);
                    handleSupabaseError(error, 'deleting section');
                    if (!error) {
                        setSections(prev => prev.filter(u => u !== sectionName));
                    }
                } catch (e: any) {
                     console.error(`Failed to delete section: ${e.message}`);
                     alert(`خطا در حذف بخش: ${e.message}`);
                }
                finally {
                    setIsActionLoading(false);
                }
            }
        });
    };

    const handleUpdateProjectState = (projectToUpdate) => {
        setProjects(prevProjects => prevProjects.map(p => 
            p.id === projectToUpdate.id ? projectToUpdate : p
        ));
        if (editingProject && editingProject.id === projectToUpdate.id) {
            setEditingProject(projectToUpdate);
        }
    };

    // --- Team Management Handlers ---
    const handleAddTeamMember = async (username: string, role: TeamMemberRole = 'عضو تیم') => {
        if (!loggedInUser) return;
        setIsActionLoading(true);
        try {
            const newMember: TeamMember = { username, role };
            const { error } = await supabase.from('teams').insert({
                manager_username: loggedInUser.username,
                member_username: username,
                role: newMember.role
            });
            handleSupabaseError(error, 'adding team member');
            if (!error) {
                setTeams(prev => {
                    const currentUserTeam = prev[loggedInUser.username] || [];
                    if (currentUserTeam.some(m => m.username === username)) return prev;
                    return { ...prev, [loggedInUser.username]: [...currentUserTeam, newMember] };
                });
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRemoveTeamMember = async (username: string) => {
        if (!loggedInUser) return;

        // Check for dependencies before deleting
        const isAssigned = projects.some(p => 
            p.projectManager === username || 
            (p.activities && p.activities.some(a => a.responsible === username || a.approver === username))
        ) || actions.some(a => 
            a.responsible === username || a.approver === username
        );
    
        if (isAssigned) {
            alert('امکان حذف این کاربر وجود ندارد زیرا مسئولیت‌هایی در پروژه‌ها یا اقدامات به او تخصیص داده شده است. لطفا ابتدا وظایف او را به شخص دیگری واگذار کنید.');
            return;
        }

        setIsActionLoading(true);
        try {
            const { error } = await supabase.from('teams').delete()
                .eq('manager_username', loggedInUser.username)
                .eq('member_username', username);
            handleSupabaseError(error, 'removing team member');
            if (!error) {
                setTeams(prev => {
                    const currentUserTeam = prev[loggedInUser.username] || [];
                    const newTeam = currentUserTeam.filter(m => m.username !== username);
                    return { ...prev, [loggedInUser.username]: newTeam };
                });
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateTeamMemberRole = async (username: string, role: TeamMemberRole) => {
        if (!loggedInUser) return;
        setIsActionLoading(true);
        try {
            const { error } = await supabase.from('teams').update({ role })
                .eq('manager_username', loggedInUser.username)
                .eq('member_username', username);
            handleSupabaseError(error, 'updating team member role');
            if (!error) {
                setTeams(prev => {
                    const currentUserTeam = prev[loggedInUser.username] || [];
                    const newTeam = currentUserTeam.map(m => m.username === username ? { ...m, role } : m);
                    return { ...prev, [loggedInUser.username]: newTeam };
                });
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const taskItems = [
        ...projects.flatMap(p => p.activities.map(a => ({...a, type: 'activity', parentName: p.title, use_workflow: p.use_workflow}))),
        ...actions.map(a => ({...a, type: 'action', parentName: 'اقدام مستقل'}))
    ].filter(item => item.responsible === loggedInUser?.username);

    const approvalItems = [
         ...projects.flatMap(p => p.activities.map(a => ({...a, type: 'activity', parentName: p.title}))),
        ...actions.map(a => ({...a, type: 'action', parentName: 'اقدام مستقل'}))
    ].filter(item => item.approver === loggedInUser?.username && item.status === 'ارسال برای تایید');

    const currentUserTeam = teams[loggedInUser?.username] || [];

    const notStartedTasksCount = React.useMemo(() => {
        if (!loggedInUser) return 0;
        return taskItems.filter(item => item.status === 'شروع نشده').length;
    }, [taskItems, loggedInUser]);
    
    const pendingApprovalsCount = React.useMemo(() => {
        if (!loggedInUser) return 0;
        return approvalItems.length;
    }, [approvalItems, loggedInUser]);

    const notStartedProjectsAndActionsCount = React.useMemo(() => {
        if (!loggedInUser) return 0;
        const isAdmin = loggedInUser.username === 'mahmoudi.pars@gmail.com';
        
        const visibleProjects = isAdmin ? projects : projects.filter(p => 
            p.owner === loggedInUser.username ||
            p.projectManager === loggedInUser.username ||
            (p.activities && p.activities.some(act => act.responsible === loggedInUser.username || act.approver === loggedInUser.username))
        );
        const visibleActions = isAdmin ? actions : actions.filter(a => 
            a.owner === loggedInUser.username ||
            a.responsible === loggedInUser.username ||
            a.approver === loggedInUser.username
        );
        
        const notStartedProjects = visibleProjects.filter(p => p.status === 'شروع نشده').length;
        const notStartedActions = visibleActions.filter(a => a.status === 'شروع نشده').length;
        
        return notStartedProjects + notStartedActions;
    }, [projects, actions, loggedInUser]);
    
    const badgeCounts = {
        tasks: notStartedTasksCount,
        approvals: pendingApprovalsCount,
        projects_actions_list: notStartedProjectsAndActionsCount,
    };

    const renderContent = () => {
        const isAdmin = loggedInUser?.username === 'mahmoudi.pars@gmail.com';

        switch(view) {
            // FIX: Removed `sections` prop from DashboardPage as it is not an expected prop.
            case 'dashboard':
                 return <DashboardPage
                            projects={projects}
                            actions={actions}
                            currentUser={loggedInUser}
                            users={users}
                            onViewDetails={handleViewDetails}
                        />;
            case 'my_team':
                return <MyTeamPage
                            allUsers={users}
                            currentUser={loggedInUser}
                            teamMembers={currentUserTeam}
                            onAddMember={handleAddTeamMember}
                            onRemoveMember={handleRemoveTeamMember}
                            onUpdateRole={handleUpdateTeamMemberRole}
                        />;
            // FIX: Removed `sections` prop from DashboardPage as it is not an expected prop.
            case 'users':
                return isAdmin ? <UserManagementPage users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} onToggleUserActive={handleToggleUserActive} onEditUser={handleEditUser} /> : <DashboardPage projects={projects} actions={actions} currentUser={loggedInUser} users={users} onViewDetails={handleViewDetails} />;
            case 'projects_actions_list':
                return <ProjectsActionsListPage projects={projects} actions={actions} currentUser={loggedInUser} onViewDetails={handleViewDetails} onEditProject={handleEditProject} onDeleteProject={handleDeleteProject} onEditAction={handleEditAction} onDeleteAction={handleDeleteAction} onShowHistory={handleShowHistory} users={users} />;
            case 'tasks':
                return <TasksPage 
                            items={taskItems} 
                            currentUser={loggedInUser} 
                            onSendForApproval={handleSendForApproval} 
                            onShowHistory={handleShowHistory} 
                            users={users} 
                            onDelegateTask={handleDelegateTask}
                            projects={projects}
                            actions={actions}
                            teamMembers={currentUserTeam}
                            onMassDelegate={handleMassDelegateTasks}
                            onViewDetails={handleViewDetails}
                            onDirectStatusUpdate={handleDirectStatusUpdate}
                        />;
            case 'approvals':
                return <ApprovalsPage 
                            items={approvalItems} 
                            currentUser={loggedInUser} 
                            onApprovalDecision={handleRequestApprovalDecision} 
                            onShowHistory={handleShowHistory} 
                            onShowGlobalHistory={handleShowGlobalApprovalsHistory}
                            onViewDetails={handleViewDetails}
                            onShowInfo={handleShowInfo}
                            users={users}
                        />;
            case 'settings':
                return <SettingsPage 
                            theme={theme} 
                            onThemeChange={handleThemeChange}
                            sections={sections}
                            onAddSection={handleAddSection}
                            onUpdateSection={handleUpdateSection}
                            onDeleteSection={handleDeleteSection}
                            currentUser={loggedInUser}
                        />;
            default:
                return <h2>خوش آمدید!</h2>;
        }
    };

    if (error) {
        if (!isSupabaseConfigured) {
            return (
                <div className="config-error-container">
                    <div className="login-form">
                        <h2>پیکربندی مورد نیاز است</h2>
                        <p>{error}</p>
                        <div className="code-snippet">
                            <p>فایل <strong>supabaseClient.ts</strong> را ویرایش کنید:</p>
                            <pre><code>
{`const supabaseUrl = 'https://...';
const supabaseAnonKey = '...';`}
                            </code></pre>
                        </div>
                    </div>
                </div>
            );
        }
        return <div className="loading-container">{error}</div>;
    }
    
    if (isLoading) {
        return <div className="loading-container">در حال بارگذاری اطلاعات...</div>;
    }
    
    if (view === 'login') {
        return <LoginPage onLogin={handleLogin} onSignUp={handleSignUp} />;
    }

    const isAdmin = loggedInUser?.username === 'mahmoudi.pars@gmail.com';

    return (
        <div className="app-container">
            {isActionLoading && (
                <div className="loading-overlay">
                    <div className="loading-box">
                        <div className="spinner"></div>
                        <span>لطفا منتظر باشید...</span>
                    </div>
                </div>
            )}
            <header className="header">
                <div className="header-logo-container">
                    <img src="https://parspmi.ir/uploads/c140d7143d9b4d7abbe80a36585770bc.png" alt="ParsPMI Logo" className="header-logo" />
                </div>
                <h1>سامانه مدیریت وظایف (TMS)</h1>
                <div className="header-user-info">
                   <span>{loggedInUser.full_name}</span>
                   <button onClick={handleLogout} className="logout-button">خروج</button>
                </div>
            </header>
            <div className="app-body">
                <nav className="sidebar" aria-label="Main Navigation">
                    {menuItems
                        .filter(item => {
                            if (item.id === 'users') {
                                return isAdmin;
                            }
                            return true;
                        })
                        .map(item => {
                            const badgeCount = badgeCounts[item.id] || 0;
                            return (
                                <button
                                    key={item.id}
                                    className={`sidebar-button ${view === item.id ? 'active' : ''}`}
                                    onClick={() => handleMenuClick(item.id, item.name)}
                                    title={item.name}
                                    aria-current={view === item.id ? 'page' : undefined}
                                >
                                    {item.icon}
                                    <span className="sidebar-button-text">{item.name}</span>
                                    {badgeCount > 0 && <span className="sidebar-badge">{badgeCount}</span>}
                                </button>
                            );
                        })}
                </nav>
                <main className="main-content">
                     <h2 className="page-title">{contentTitle}</h2>
                     <div className="view-content">
                        {renderContent()}
                    </div>
                </main>
            </div>
            
            <nav className="bottom-nav" aria-label="Main Navigation">
                {menuItems
                    .filter(item => {
                        if (item.id === 'users') return isAdmin;
                        if (item.id === 'define_new') return false; // Action button, not for navigation bar
                        return true;
                    })
                    .map(item => {
                        const badgeCount = badgeCounts[item.id] || 0;
                        return (
                            <button
                                key={item.id}
                                className={`bottom-nav-button ${view === item.id ? 'active' : ''}`}
                                onClick={() => handleMenuClick(item.id, item.name)}
                                title={item.name}
                                aria-current={view === item.id ? 'page' : undefined}
                            >
                                {item.icon}
                                <span className="bottom-nav-button-text">{item.name}</span>
                                {badgeCount > 0 && <span className="bottom-nav-badge">{badgeCount}</span>}
                            </button>
                        );
                    })}
            </nav>

            <button
                className="fab"
                title="تعریف پروژه و اقدام"
                onClick={() => handleMenuClick('define_new', 'تعریف پروژه و اقدام')}
                aria-label="تعریف پروژه و اقدام جدید"
            >
                <PlusIcon />
            </button>

            <ProjectDefinitionPage
                isOpen={isProjectModalOpen}
                onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); }}
                onSave={handleSaveProject}
                projectToEdit={editingProject}
                users={users}
                sections={sections}
                onRequestConfirmation={handleRequestConfirmation}
                onShowHistory={handleShowHistory}
                currentUser={loggedInUser}
                teamMembers={currentUserTeam}
                onUpdateProject={handleUpdateProjectState}
                onViewDetails={handleViewDetails}
            />
            <ActionModal 
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                onSave={handleSaveAction}
                users={users}
                sections={sections}
                actionToEdit={editingAction}
                currentUser={loggedInUser}
                teamMembers={currentUserTeam}
            />
            <DetailsModal 
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                item={detailsItem}
                users={users}
                onViewDetails={handleViewDetails}
            />
             <ApprovalInfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
                item={infoItem}
            />
            <HistoryModal 
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                history={history}
            />
            <ConfirmationModal
                isOpen={confirmationProps.isOpen}
                onClose={handleCloseConfirmation}
                onConfirm={confirmationProps.onConfirm}
                title={confirmationProps.title}
                message={confirmationProps.message}
            />
            <ApprovalDecisionModal
                isOpen={approvalDecisionProps.isOpen}
                onClose={handleCloseApprovalDecision}
                onConfirm={handleConfirmApprovalDecision}
                decisionType={approvalDecisionProps.decision}
            />
             <ChoiceModal
                isOpen={isChoiceModalOpen}
                onClose={() => setIsChoiceModalOpen(false)}
                onProject={handleChooseProject}
                onAction={handleChooseAction}
            />
            <UserEditModal 
                isOpen={isUserEditModalOpen}
                onClose={() => setIsUserEditModalOpen(false)}
                onSave={handleUpdateUser}
                userToEdit={editingUser}
            />
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);