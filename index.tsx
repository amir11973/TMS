/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, FormEvent, useEffect, useCallback, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import moment from 'moment-jalaali';
import { User, TeamMember, TeamMemberRole, CustomField } from './types';
import { menuItems, getTodayString } from './constants';
import { supabase, handleSupabaseError, isSupabaseConfigured } from './supabaseClient';
import { PlusIcon, ChatbotIcon, AiAnalysisIcon } from './icons';
// FIX: Import 'toPersianDigits' to resolve 'Cannot find name' errors.
import { toPersianDigits } from './utils';

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
    ApprovalDecisionModal,
    AlertModal,
    SendApprovalModal,
    ChatbotModal,
    DashboardListModal,
    NotesModal,
    AiAnalysisModal,
    CustomFieldModal
} from './modals/index';
import { UserInfoModal } from './modals';

moment.loadPersian({ usePersianDigits: true });

const findUserByMention = (mention: string | null | undefined, users: User[]): string | undefined => {
    if (!mention) return undefined;
    const lowerMention = mention.toLowerCase().trim();
    const userByUsername = users.find(u => u.username.toLowerCase() === lowerMention);
    if (userByUsername) return userByUsername.username;
    const userByFullName = users.find(u => u.full_name && u.full_name.toLowerCase().includes(lowerMention));
    if (userByFullName) return userByFullName.username;
    return undefined;
};

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
    const [customFields, setCustomFields] = useState<CustomField[]>([]);


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
    const [alertProps, setAlertProps] = useState({ isOpen: false, title: '', message: '' });

    const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
    
    const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [sendApprovalProps, setSendApprovalProps] = useState({ isOpen: false, item: null as any, requestedStatus: '' });

    const [userInfoUser, setUserInfoUser] = useState<User | null>(null);
    const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isAiAnalysisModalOpen, setIsAiAnalysisModalOpen] = useState(false);

    const [notesModalProps, setNotesModalProps] = useState({ isOpen: false, item: null as any, viewMode: 'responsible' as 'responsible' | 'approver' });

    const [isCustomFieldModalOpen, setIsCustomFieldModalOpen] = useState(false);
    const [editingCustomField, setEditingCustomField] = useState<CustomField | null>(null);

    const isInitialRenderRef = useRef(true);
    
    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    const fetchData = useCallback(async () => {
        try {
            const [usersRes, projectsRes, actionsRes, sectionsRes, teamsRes, customFieldsRes] = await Promise.all([
                supabase.from('users').select('*'),
                supabase.from('projects').select('*, activities(*)').order('kanban_order', { foreignTable: 'activities', ascending: true, nullsFirst: false }).order('id', { foreignTable: 'activities' }),
                supabase.from('actions').select('*').order('kanban_order', { ascending: true, nullsFirst: false }),
                supabase.from('units').select('name'),
                supabase.from('teams').select('*'),
                supabase.from('custom_fields').select('*')
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
            // FIX: Explicitly typing the initial value for `reduce` ensures `reconstructedTeams` is correctly typed.
            const reconstructedTeams = teamsData.reduce((acc, team) => {
                if (!acc[team.manager_username]) {
                    acc[team.manager_username] = [];
                }
                acc[team.manager_username].push({ username: team.member_username, role: team.role });
                return acc;
            }, {} as Record<string, TeamMember[]>);
            setTeams(reconstructedTeams);

            handleSupabaseError(customFieldsRes.error, 'fetching custom fields');
            setCustomFields(customFieldsRes.data || []);

        } catch (e: any) {
            setError(`Failed to load application data: ${e.message}. Please check your network connection and Supabase configuration in supabaseClient.ts.`);
        }
    }, []);

    useEffect(() => {
        const performInitialFetch = async () => {
            if (!isSupabaseConfigured) {
                setError('پیکربندی Supabase انجام نشده است. لطفاً فایل supabaseClient.ts را با اطلاعات پروژه خود به‌روزرسانی کنید.');
                setIsLoading(false);
                return;
            }
            await fetchData();
            setIsLoading(false);
        };
        performInitialFetch();
    }, [fetchData]);
    
    useEffect(() => {
        const performRefetch = async () => {
            setIsActionLoading(true);
            await fetchData();
            setIsActionLoading(false);
        };
    
        if (isInitialRenderRef.current) {
            isInitialRenderRef.current = false;
            return;
        }
    
        if (loggedInUser) {
            performRefetch();
        }
    }, [view, loggedInUser, fetchData]);


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

    const handleRequestAlert = ({ title, message }) => {
        setAlertProps({ isOpen: true, title, message });
    };

    const handleCloseAlert = () => {
        setAlertProps({ isOpen: false, title: '', message: '' });
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
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(username)) {
                return { error: { message: 'نام کاربری باید یک ایمیل معتبر باشد.' } };
            }

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
        if (!userToDelete) return;

        if (userToDelete.username === 'mahmoudi.pars@gmail.com') {
             handleRequestAlert({
                title: 'عملیات غیرمجاز',
                message: 'این کاربر قابل حذف نیست.'
            });
            return;
        }

        const username = userToDelete.username;
        const isAssigned = projects.some(p => 
            p.owner === username ||
            p.projectManager === username || 
            (p.activities && p.activities.some(a => a.responsible === username || a.approver === username))
        ) || actions.some(a => 
            a.owner === username ||
            a.responsible === username || 
            a.approver === username
        );

        if (isAssigned) {
            handleRequestAlert({
                title: 'امکان حذف وجود ندارد',
                message: 'امکان حذف این کاربر وجود ندارد زیرا مسئولیت‌هایی در پروژه‌ها یا اقدامات به او تخصیص داده شده است. لطفا ابتدا وظایف او را به شخص دیگری واگذار کنید.'
            });
            return;
        }

        handleRequestConfirmation({
            title: 'حذف کاربر',
            message: `آیا از حذف کاربر "${userToDelete.username}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`,
            onConfirm: async () => {
                setIsActionLoading(true);
                try {
                    // Also delete the user from any teams they are a member of
                    const { error: teamMembershipError } = await supabase
                        .from('teams')
                        .delete()
                        .eq('member_username', userToDelete.username);
                    handleSupabaseError(teamMembershipError, 'deleting user memberships');

                    // Also delete any team managed by this user
                    const { error: managedTeamError } = await supabase
                        .from('teams')
                        .delete()
                        .eq('manager_username', userToDelete.username);
                    handleSupabaseError(managedTeamError, 'deleting managed team');

                     const { error: userError } = await supabase.from('users').delete().eq('id', userId);
                     handleSupabaseError(userError, 'deleting user');
                     if (!userError) {
                        // Instead of manually updating parts of state, refetch all data for consistency
                        await fetchData();
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

    const handleShowUserInfo = (user: User) => {
        setUserInfoUser(user);
        setIsUserInfoModalOpen(true);
    };

    const handleCloseUserInfo = () => {
        setIsUserInfoModalOpen(false);
        setUserInfoUser(null);
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
                newProjectPayload.owner = loggedInUser.username;
                delete newProjectPayload.id; // Ensure ID is not sent for new records
                const { data, error } = await supabase.from('projects').insert(newProjectPayload).select().single();
                handleSupabaseError(error, 'creating new project');
                if (data) {
                    const newProject = { ...data, activities: [] };
                    setProjects(prev => [...prev, newProject]);
                    setEditingProject({ ...newProject, initialTab: 'activities' });
                } else {
                    handleRequestAlert({
                        title: 'خطا در ذخیره‌سازی',
                        message: 'اطلاعات پروژه ذخیره نشد. لطفا دوباره تلاش کنید.'
                    });
                }
            } else {
                const { activities, type, readOnly, initialTab, isNew, responsible, ...updatePayload } = projectToSave;
                const { data, error } = await supabase.from('projects').update(updatePayload).eq('id', projectToSave.id).select().single();
                handleSupabaseError(error, 'updating project');
                if (data) {
                    const updatedProject = { ...data, activities: projectToSave.activities };
                    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
                    setIsProjectModalOpen(false);
                    setEditingProject(null);
                } else {
                    handleRequestAlert({
                        title: 'خطا در بروزرسانی',
                        message: 'اطلاعات پروژه بروزرسانی نشد. لطفا دوباره تلاش کنید.'
                    });
                }
            }
        } catch (e: any) {
            handleRequestAlert({
                title: 'خطا در ذخیره‌سازی',
                message: `اطلاعات پروژه ذخیره نشد. لطفا دوباره تلاش کنید. (${e.message})`
            });
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
                    setIsActionModalOpen(false);
                    setEditingAction(null);
                } else {
                    handleRequestAlert({
                        title: 'خطا در بروزرسانی',
                        message: 'اطلاعات اقدام بروزرسانی نشد. لطفا دوباره تلاش کنید.'
                    });
                }
            } else { // Insert
                const newActionPayload = { ...actionToSave, owner: loggedInUser.username, history: [{ status: actionToSave.status, user: loggedInUser.username, date: new Date().toISOString() }], kanban_order: Date.now() };
                delete newActionPayload.id;
                const { data, error } = await supabase.from('actions').insert(newActionPayload).select().single();
                handleSupabaseError(error, 'creating new action');
                if (data) {
                    setActions(prev => [...prev, data]);
                    setIsActionModalOpen(false);
                    setEditingAction(null);
                } else {
                     handleRequestAlert({
                        title: 'خطا در ذخیره‌سازی',
                        message: 'اطلاعات اقدام ذخیره نشد. لطفا دوباره تلاش کنید.'
                    });
                }
            }
        } catch (e: any) {
            handleRequestAlert({
                title: 'خطا در ذخیره‌سازی',
                message: `اطلاعات اقدام ذخیره نشد. لطفا دوباره تلاش کنید. (${e.message})`
            });
        } finally {
            setIsActionLoading(false);
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
                const decisions = item.history.filter((entry: any) => 
                    (entry.approvalDecision === 'approved' || entry.approvalDecision === 'rejected') && entry.user === loggedInUser.username
                );
                
                decisions.forEach((decisionEntry: any) => {
                    const decisionIndex = item.history.findIndex((h: any) => h === decisionEntry);
                    let requestEntry = null;

                    if (decisionIndex > -1) {
                         // Find the most recent 'send for approval' before this decision
                         for (let i = decisionIndex - 1; i >= 0; i--) {
                            if (item.history[i].status === 'ارسال برای تایید') {
                                requestEntry = item.history[i];
                                break;
                            }
                        }
                    }

                    const enhancedEntry = { 
                        ...decisionEntry, 
                        parentTitle: item.parentTitle,
                        requestComment: requestEntry?.comment,
                        requestFileUrl: requestEntry?.fileUrl,
                        requestFileName: requestEntry?.fileName,
                    };
                    history.push(enhancedEntry);
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
    const handleAddTeamMember = async (username: string) => {
        if (!loggedInUser) return;
        setIsActionLoading(true);
        try {
            const role: TeamMemberRole = username === loggedInUser.username ? 'ادمین' : 'عضو تیم';
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

    const handleRemoveTeamMember = (username: string) => {
        if (!loggedInUser) return;

        const isAssigned = projects.some(p => 
            p.projectManager === username || 
            (p.activities && p.activities.some(a => a.responsible === username || a.approver === username))
        ) || actions.some(a => 
            a.responsible === username || a.approver === username
        );
    
        if (isAssigned) {
            handleRequestAlert({
                title: 'امکان حذف وجود ندارد',
                message: 'امکان حذف این عضو تیم وجود ندارد زیرا مسئولیت‌هایی در پروژه‌ها یا اقدامات به او تخصیص داده شده است. لطفا ابتدا وظایف او را به شخص دیگری واگذار کنید.'
            });
            return;
        }

        const userDetails = users.find(u => u.username === username);
        handleRequestConfirmation({
            title: 'حذف عضو تیم',
            message: `آیا از حذف "${userDetails?.full_name || username}" از تیم خود اطمینان دارید؟`,
            onConfirm: async () => {
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
            }
        });
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

    // --- Custom Field Handlers ---
    const handleOpenCustomFieldModal = (field: CustomField | null = null) => {
        setEditingCustomField(field);
        setIsCustomFieldModalOpen(true);
    };

    const handleCloseCustomFieldModal = () => {
        setEditingCustomField(null);
        setIsCustomFieldModalOpen(false);
    };

    const handleSaveCustomField = async (fieldToSave: any) => {
        if (!loggedInUser) return;
        setIsActionLoading(true);
        try {
            if (fieldToSave.id) { // Update
                const { error } = await supabase.from('custom_fields').update(fieldToSave).eq('id', fieldToSave.id);
                handleSupabaseError(error, 'updating custom field');
                if (!error) {
                    setCustomFields(prev => prev.map(f => f.id === fieldToSave.id ? fieldToSave : f));
                }
            } else { // Insert
                const payload = { ...fieldToSave, owner_username: loggedInUser.username };
                delete payload.id;
                const { data, error } = await supabase.from('custom_fields').insert(payload).select().single();
                handleSupabaseError(error, 'creating custom field');
                if (data) {
                    setCustomFields(prev => [...prev, data]);
                }
            }
        } finally {
            setIsActionLoading(false);
            handleCloseCustomFieldModal();
        }
    };

    const handleDeleteCustomField = (fieldId: number) => {
        const fieldToDelete = customFields.find(f => f.id === fieldId);
        handleRequestConfirmation({
            title: 'حذف فیلد سفارشی',
            message: `آیا از حذف فیلد "${fieldToDelete?.title}" اطمینان دارید؟ این عمل تمام مقادیر ذخیره شده برای این فیلد را نیز حذف خواهد کرد.`,
            onConfirm: async () => {
                setIsActionLoading(true);
                try {
                    const { error } = await supabase.from('custom_fields').delete().eq('id', fieldId);
                    handleSupabaseError(error, 'deleting custom field');
                    if (!error) {
                        setCustomFields(prev => prev.filter(f => f.id !== fieldId));
                        // Note: This does not clean up orphaned values in JSONB columns.
                        // A database function would be better for production.
                    }
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
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
    
    const handleRequestSendForApproval = (item: any, requestedStatus: string) => {
        setSendApprovalProps({ isOpen: true, item, requestedStatus });
    };

    const handleCloseSendForApproval = () => {
        setSendApprovalProps({ isOpen: false, item: null, requestedStatus: '' });
    };

    const handleConfirmSendForApproval = async ({ comment, file }: { comment: string, file: File | null }) => {
        const { item, requestedStatus } = sendApprovalProps;
        if (!item || !requestedStatus || !loggedInUser) return;

        setIsActionLoading(true);
        try {
            let fileUrl = null;
            let fileName = null;

            if (file) {
                const fileExt = file.name.split('.').pop();
                const newFileName = `${Math.random()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('task_attachments')
                    .upload(newFileName, file);

                if (uploadError) {
                    handleSupabaseError(uploadError, 'uploading attachment');
                    return;
                }
                
                const { data: urlData } = supabase.storage.from('task_attachments').getPublicUrl(uploadData.path);
                fileUrl = urlData.publicUrl;
                fileName = file.name;
            }

            const isActivity = item.type === 'activity';
            const tableName = isActivity ? 'activities' : 'actions';

            let itemToUpdate: any, parentProject: any;
            if (isActivity) {
                for (const p of projects) {
                    const found = p.activities.find((a: any) => a.id === item.id);
                    if (found) {
                        itemToUpdate = found;
                        parentProject = p;
                        break;
                    }
                }
            } else {
                itemToUpdate = actions.find((a: any) => a.id === item.id);
            }

            if (!itemToUpdate) return;
            
            const historyEntry = {
                status: 'ارسال برای تایید',
                user: loggedInUser.username,
                date: new Date().toISOString(),
                comment,
                requestedStatus,
                fileUrl,
                fileName,
            };

            const updatePayload = {
                status: 'ارسال برای تایید',
                underlyingStatus: itemToUpdate.status,
                requestedStatus: requestedStatus,
                history: [...(itemToUpdate.history || []), historyEntry],
                approvalStatus: 'pending'
            };

            const { data, error } = await supabase.from(tableName).update(updatePayload).eq('id', item.id).select().single();
            handleSupabaseError(error, 'sending for approval');

            if (!error && data) {
                if (isActivity && parentProject) {
                    const updatedActivities = parentProject.activities.map((act: any) => act.id === item.id ? data : act);
                    const updatedProject = { ...parentProject, activities: updatedActivities };
                    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
                } else {
                    setActions(prev => prev.map((act: any) => act.id === item.id ? data : act));
                }
            }
        } finally {
            setIsActionLoading(false);
            handleCloseSendForApproval();
        }
    };
    
    const handleUpdateItemsOrder = async (updates: { id: number; type: string; kanban_order: number }[]) => {
        setIsActionLoading(true);
        try {
            const updatePromises = updates.map(update => {
                const tableName = update.type === 'activity' ? 'activities' : 'actions';
                return supabase.from(tableName).update({ kanban_order: update.kanban_order }).eq('id', update.id);
            });

            const results = await Promise.all(updatePromises);
            results.forEach(res => handleSupabaseError(res.error, 'updating item order'));

            // Optimistically update local state to reflect new order instantly
            const activityUpdates = new Map(updates.filter(u => u.type === 'activity').map(u => [u.id, u.kanban_order]));
            const actionUpdates = new Map(updates.filter(u => u.type === 'action').map(u => [u.id, u.kanban_order]));

            if (activityUpdates.size > 0) {
                setProjects(prev => prev.map(p => ({
                    ...p,
                    activities: p.activities.map(act => activityUpdates.has(act.id) ? { ...act, kanban_order: activityUpdates.get(act.id) } : act)
                })));
            }
            if (actionUpdates.size > 0) {
                setActions(prev => prev.map(a => actionUpdates.has(a.id) ? { ...a, kanban_order: actionUpdates.get(a.id) } : a));
            }

        } catch (e: any) {
             handleRequestAlert({
                title: 'خطا در بروزرسانی ترتیب',
                message: `ترتیب آیتم‌ها بروزرسانی نشد. لطفا دوباره تلاش کنید. (${e.message})`
            });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleOpenNotesModal = (item: any, viewMode: 'responsible' | 'approver') => {
        setNotesModalProps({ isOpen: true, item, viewMode });
    };

    const handleCloseNotesModal = () => {
        setNotesModalProps({ isOpen: false, item: null, viewMode: 'responsible' });
    };

    const handleAiAnalysisRequest = () => {
        setIsAiAnalysisModalOpen(true);
    };
    
    // ... chatbot handlers, etc.
    const createItemForChatbot = async (itemType: 'project' | 'action' | 'activity', args: any) => {
        // FIX: Add a check for `loggedInUser` to prevent errors and ensure a user is logged in.
        if (!loggedInUser) return { success: false, error: 'کاربر وارد نشده است.' };
        if (!args.title) return { success: false, error: 'عنوان الزامی است.' };
        if (itemType === 'activity' && !args.project_name) return { success: false, error: 'نام پروژه برای ایجاد فعالیت الزامی است.' };

        // FIX: Replaced 'currentUser' with the correct state variable 'loggedInUser'.
        const responsibleUser = findUserByMention(args.responsible, users) || loggedInUser.username;
        // FIX: Replaced 'currentUser' with the correct state variable 'loggedInUser'.
        const approverUser = findUserByMention(args.approver, users) || loggedInUser.username;
        // FIX: Replaced 'currentUser' with the correct state variable 'loggedInUser'.
        const projectManagerUser = findUserByMention(args.projectManager, users) || loggedInUser.username;

        const defaultData = {
            title: args.title,
            priority: args.priority || 'متوسط',
            startDate: args.startDate ? moment(args.startDate, 'jYYYY/jMM/jDD').toISOString().split('T')[0] : getTodayString(),
            endDate: args.endDate ? moment(args.endDate, 'jYYYY/jMM/jDD').toISOString().split('T')[0] : getTodayString(),
        };

        if (itemType === 'project') {
            // FIX: Replaced 'currentUser' with the correct state variable 'loggedInUser'.
            const projectData = { ...defaultData, projectStartDate: defaultData.startDate, projectEndDate: defaultData.endDate, isNew: true, owner: loggedInUser.username, activities: [], projectManager: projectManagerUser, unit: args.unit || sections[0], projectGoal: args.projectGoal || '' };
            await handleSaveProject(projectData);
            return { success: true, title: args.title };
        }

        if (itemType === 'action') {
            const actionData = { ...defaultData, responsible: responsibleUser, approver: approverUser, unit: args.unit || sections[0], status: 'شروع نشده' };
            await handleSaveAction(actionData);
            return { success: true, title: args.title };
        }

        if (itemType === 'activity') {
            const parentProject = projects.find(p => p.title.toLowerCase().includes(args.project_name.toLowerCase()));
            if (!parentProject) return { success: false, error: `پروژه ای با نام '${args.project_name}' یافت نشد.` };

            const newActivity = { ...defaultData, responsible: responsibleUser, approver: approverUser, project_id: parentProject.id, status: 'شروع نشده', history: [] };
            
            // This logic is in ProjectDefinitionPage, so we simulate it here.
            // FIX: Replaced incorrect function name 'onSetIsActionLoading' with 'setIsActionLoading'.
            setIsActionLoading(true);
            try {
                const { data, error } = await supabase.from('activities').insert(newActivity).select().single();
                handleSupabaseError(error, 'creating activity via chatbot');
                if (data) {
                    const updatedProject = { ...parentProject, activities: [...parentProject.activities, data] };
                    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
                    return { success: true, title: args.title, parent: parentProject.title };
                } else {
                    return { success: false, error: 'خطا در ذخیره فعالیت در پایگاه داده.' };
                }
            } finally {
                // FIX: Replaced incorrect function name 'onSetIsActionLoading' with 'setIsActionLoading'.
                setIsActionLoading(false);
            }
        }
        return { success: false, error: 'نوع آیتم نامعتبر است.' };
    };
    
    const deleteItemForChatbot = async (itemType: 'project' | 'action' | 'activity', args: any) => {
        if (!args.title) return { success: false, error: 'عنوان برای حذف الزامی است.' };
    
        let itemToDelete;
        let parentProjectTitle = '';
    
        if (itemType === 'project') {
            itemToDelete = projects.find(p => p.title.toLowerCase() === args.title.toLowerCase());
        } else if (itemType === 'action') {
            itemToDelete = actions.find(a => a.title.toLowerCase() === args.title.toLowerCase());
        } else if (itemType === 'activity') {
            if (!args.project_name) return { success: false, error: 'نام پروژه برای حذف فعالیت الزامی است.' };
            const parentProject = projects.find(p => p.title.toLowerCase().includes(args.project_name.toLowerCase()));
            if (!parentProject) return { success: false, error: `پروژه ای با نام '${args.project_name}' یافت نشد.` };
            itemToDelete = parentProject.activities.find((a:any) => a.title.toLowerCase() === args.title.toLowerCase());
            parentProjectTitle = parentProject.title;
        }
    
        if (!itemToDelete) return { success: false, error: `${itemType} با عنوان '${args.title}' یافت نشد.` };
    
        // FIX: Replaced incorrect function name 'onSetIsActionLoading' with 'setIsActionLoading'.
        setIsActionLoading(true);
        try {
            const tableName = itemType === 'activity' ? 'activities' : `${itemType}s`;
            const { error } = await supabase.from(tableName).delete().eq('id', itemToDelete.id);
            handleSupabaseError(error, `deleting ${itemType} via chatbot`);
            if (error) {
                return { success: false, error: `خطا در حذف از پایگاه داده: ${error.message}` };
            }
    
            // Refetch data for consistency after deletion
            await fetchData();
            return { success: true, title: args.title, parent: parentProjectTitle };
        } finally {
            // FIX: Replaced incorrect function name 'onSetIsActionLoading' with 'setIsActionLoading'.
            setIsActionLoading(false);
        }
    };
    
    const addTeamMemberForChatbot = async (args: any) => {
        if (!args.username) return { success: false, error: 'نام کاربری برای افزودن عضو الزامی است.' };
        const userToAdd = findUserByMention(args.username, users);
        if (!userToAdd) return { success: false, error: `کاربری با نام '${args.username}' یافت نشد.` };
        
        await handleAddTeamMember(userToAdd);
        const userDetails = users.find(u => u.username === userToAdd);
        return { success: true, name: userDetails?.full_name || userToAdd, role: args.role || 'عضو تیم' };
    };

    const removeTeamMemberForChatbot = async (args: any) => {
        if (!args.username) return { success: false, error: 'نام کاربری برای حذف عضو الزامی است.' };
        const userToRemove = findUserByMention(args.username, users);
         if (!userToRemove) return { success: false, error: `کاربری با نام '${args.username}' یافت نشد.` };

        const teamMember = (teams[loggedInUser.username] || []).find(m => m.username === userToRemove);
        if (!teamMember) return { success: false, error: `کاربر '${args.username}' عضو تیم شما نیست.`};
        
        // This will trigger a confirmation modal, so we can't await it directly.
        // We'll proceed optimistically.
        handleRemoveTeamMember(userToRemove);
        const userDetails = users.find(u => u.username === userToRemove);
        return { success: true, name: userDetails?.full_name || userToRemove };
    };


    if (isLoading) {
        return <div className="loading-container">بارگذاری اطلاعات...</div>;
    }

    if (error) {
        return <div className="loading-container">{error}</div>;
    }

    if (!isSupabaseConfigured) {
        return (
            <div className="config-error-container">
                <div className="login-form">
                    <img src="https://parspmi.ir/uploads/c140d7143d9b4d7abbe80a36585770bc.png" alt="ParsPMI Logo" className="login-logo" />
                    <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>خطا در پیکربندی</h3>
                    <p>{error}</p>
                    <div className="code-snippet">
                        <p>برای رفع مشکل، فایل زیر را با اطلاعات پروژه Supabase خود به‌روزرسانی کنید:</p>
                        <pre><code>
{`// supabaseClient.ts

const supabaseUrl = '...';
const supabaseAnonKey = '...';`}
                        </code></pre>
                    </div>
                </div>
            </div>
        );
    }
    
    const mainContent = () => {
        if (!loggedInUser) {
            return <LoginPage onLogin={handleLogin} onSignUp={handleSignUp} />;
        }

        switch (view) {
            case 'dashboard':
                return <DashboardPage projects={projects} actions={actions} currentUser={loggedInUser} users={users} teams={teams} onViewDetails={handleViewDetails} />;
            case 'projects_actions_list':
                return <ProjectsActionsListPage projects={projects} actions={actions} onViewDetails={handleViewDetails} onEditProject={handleEditProject} onDeleteProject={handleDeleteProject} onEditAction={handleEditAction} onDeleteAction={handleDeleteAction} currentUser={loggedInUser} onShowHistory={handleShowHistory} users={users} teams={teams} />;
            case 'tasks':
                return <TasksPage items={taskItems} currentUser={loggedInUser} onShowHistory={handleShowHistory} users={users} onDelegateTask={handleDelegateTask} projects={projects} actions={actions} teamMembers={currentUserTeam} onMassDelegate={handleMassDelegateTasks} onViewDetails={handleViewDetails} onDirectStatusUpdate={updateItemStatus} onSendForApproval={handleRequestSendForApproval} onOpenNotesModal={handleOpenNotesModal} onUpdateItemsOrder={handleUpdateItemsOrder} onRequestAlert={handleRequestAlert} />;
            case 'approvals':
                return <ApprovalsPage items={approvalItems} currentUser={loggedInUser} onApprovalDecision={handleRequestApprovalDecision} onShowHistory={handleShowHistory} onShowGlobalHistory={handleShowGlobalApprovalsHistory} onViewDetails={handleViewDetails} onShowInfo={handleShowInfo} users={users} onOpenNotesModal={handleOpenNotesModal}/>;
            case 'users':
                return <UserManagementPage users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} onToggleUserActive={handleToggleUserActive} onEditUser={handleEditUser} onShowUserInfo={handleShowUserInfo} />;
            case 'my_team':
                return <MyTeamPage allUsers={users} currentUser={loggedInUser} teamMembers={currentUserTeam} onAddMember={handleAddTeamMember} onRemoveMember={handleRemoveTeamMember} onUpdateRole={handleUpdateTeamMemberRole} />;
            case 'settings':
                return <SettingsPage 
                            theme={theme} 
                            onThemeChange={handleThemeChange} 
                            sections={sections} 
                            onAddSection={handleAddSection} 
                            onUpdateSection={handleUpdateSection} 
                            onDeleteSection={handleDeleteSection} 
                            currentUser={loggedInUser} 
                            customFields={customFields}
                            onOpenCustomFieldModal={handleOpenCustomFieldModal}
                            onDeleteCustomField={handleDeleteCustomField}
                        />;
            default:
                return <div>صفحه مورد نظر یافت نشد.</div>;
        }
    };
    
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
            {loggedInUser && (
                <>
                    <header className="header">
                        <div className="header-logo-container">
                           <img src="https://parspmi.ir/uploads/c140d7143d9b4d7abbe80a36585770bc.png" alt="ParsPMI Logo" className="header-logo" />
                        </div>
                        <h1>{contentTitle}</h1>
                        <div className="header-user-info">
                            <span>{loggedInUser.full_name}</span>
                            <button onClick={handleLogout} className="logout-button">خروج</button>
                        </div>
                    </header>
                    <div className="app-body">
                        <nav className="sidebar">
                            {menuItems.map(item => {
                                 // Admin-only views
                                if (item.id === 'users' && loggedInUser.username !== 'mahmoudi.pars@gmail.com') {
                                    return null;
                                }
                                return (
                                    <button key={item.id} className={`sidebar-button ${view === item.id ? 'active' : ''}`} onClick={() => handleMenuClick(item.id, item.name)}>
                                        {item.icon}
                                        <span className="sidebar-button-text">{item.name}</span>
                                         {item.id === 'tasks' && notStartedTasksCount > 0 && <span className="sidebar-badge">{toPersianDigits(notStartedTasksCount)}</span>}
                                        {item.id === 'approvals' && pendingApprovalsCount > 0 && <span className="sidebar-badge">{toPersianDigits(pendingApprovalsCount)}</span>}
                                    </button>
                                )
                            })}
                        </nav>
                        <main className="main-content">
                            <div className="view-content">
                                {mainContent()}
                            </div>
                        </main>
                         {view !== 'define_new' && (
                            <button className="fab" onClick={handleDefineNew} title="تعریف پروژه یا اقدام جدید">
                                <PlusIcon />
                            </button>
                        )}
                        <button className="ai-fab" onClick={handleAiAnalysisRequest} title="تحلیل هوشمند وظایف">
                            <AiAnalysisIcon />
                        </button>
                        <button className="chatbot-fab" onClick={() => setIsChatbotOpen(true)} title="دستیار هوشمند">
                            <ChatbotIcon />
                        </button>
                    </div>
                     <nav className="bottom-nav">
                        {menuItems.map(item => {
                            if (item.id === 'users' && loggedInUser.username !== 'mahmoudi.pars@gmail.com') return null;
                            if (item.id === 'define_new') return null;

                            return (
                                <button key={item.id} className={`bottom-nav-button ${view === item.id ? 'active' : ''}`} onClick={() => handleMenuClick(item.id, item.name)}>
                                    {item.icon}
                                    <span>{item.name}</span>
                                    {item.id === 'tasks' && notStartedTasksCount > 0 && <span className="bottom-nav-badge">{toPersianDigits(notStartedTasksCount)}</span>}
                                    {item.id === 'approvals' && pendingApprovalsCount > 0 && <span className="bottom-nav-badge">{toPersianDigits(pendingApprovalsCount)}</span>}
                                </button>
                            );
                        })}
                    </nav>
                </>
            )}
            {!loggedInUser && mainContent()}

            <ActionModal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} onSave={handleSaveAction} users={users} sections={sections} actionToEdit={editingAction} currentUser={loggedInUser} teamMembers={currentUserTeam} onRequestAlert={handleRequestAlert} customFields={customFields} />
            <ProjectDefinitionPage isOpen={isProjectModalOpen} onClose={() => {setIsProjectModalOpen(false); setEditingProject(null);}} onSave={handleSaveProject} projectToEdit={editingProject} users={users} sections={sections} onRequestConfirmation={handleRequestConfirmation} onShowHistory={handleShowHistory} currentUser={loggedInUser} teamMembers={currentUserTeam} onUpdateProject={handleUpdateProjectState} onViewDetails={handleViewDetails} onRequestAlert={handleRequestAlert} teams={teams} onSetIsActionLoading={setIsActionLoading} customFields={customFields} />
            <DetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} item={detailsItem} users={users} onViewDetails={handleViewDetails} customFields={customFields} currentUser={loggedInUser} />
            <ApprovalInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} item={infoItem} />
            <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} history={history} users={users} />
            <ConfirmationModal isOpen={confirmationProps.isOpen} onClose={handleCloseConfirmation} onConfirm={confirmationProps.onConfirm} title={confirmationProps.title} message={confirmationProps.message} />
            <AlertModal isOpen={alertProps.isOpen} onClose={handleCloseAlert} title={alertProps.title} message={alertProps.message} />
            <ApprovalDecisionModal isOpen={approvalDecisionProps.isOpen} onClose={handleCloseApprovalDecision} onConfirm={handleConfirmApprovalDecision} decisionType={approvalDecisionProps.decision} />
            <ChoiceModal isOpen={isChoiceModalOpen} onClose={() => setIsChoiceModalOpen(false)} onProject={handleChooseProject} onAction={handleChooseAction} />
            <UserEditModal isOpen={isUserEditModalOpen} onClose={() => setIsUserEditModalOpen(false)} onSave={handleUpdateUser} userToEdit={editingUser} />
            <SendApprovalModal isOpen={sendApprovalProps.isOpen} onClose={handleCloseSendForApproval} onSend={handleConfirmSendForApproval} requestedStatus={sendApprovalProps.requestedStatus} />
            <UserInfoModal isOpen={isUserInfoModalOpen} onClose={handleCloseUserInfo} user={userInfoUser} />
            <ChatbotModal 
                isOpen={isChatbotOpen} 
                onClose={() => setIsChatbotOpen(false)} 
                projects={projects}
                actions={actions}
                users={users}
                currentUser={loggedInUser}
                taskItems={taskItems}
                approvalItems={approvalItems}
                teamMembers={currentUserTeam}
                onCreateProject={(args) => createItemForChatbot('project', args)}
                onCreateAction={(args) => createItemForChatbot('action', args)}
                onCreateActivity={(args) => createItemForChatbot('activity', args)}
                onAddTeamMember={addTeamMemberForChatbot}
                onRemoveTeamMember={removeTeamMemberForChatbot}
                onDeleteProject={(args) => deleteItemForChatbot('project', args)}
                onDeleteAction={(args) => deleteItemForChatbot('action', args)}
                onDeleteActivity={(args) => deleteItemForChatbot('activity', args)}
            />
             <NotesModal 
                isOpen={notesModalProps.isOpen}
                onClose={handleCloseNotesModal}
                item={notesModalProps.item}
                viewMode={notesModalProps.viewMode}
                currentUser={loggedInUser}
                users={users}
            />
            {loggedInUser && (
                <AiAnalysisModal
                    isOpen={isAiAnalysisModalOpen}
                    onClose={() => setIsAiAnalysisModalOpen(false)}
                    analysisItems={taskItems}
                    currentUser={loggedInUser}
                />
            )}
            <CustomFieldModal
                isOpen={isCustomFieldModalOpen}
                onClose={handleCloseCustomFieldModal}
                onSave={handleSaveCustomField}
                fieldToEdit={editingCustomField}
            />
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);