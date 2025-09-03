/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, FormEvent, useEffect } from 'react';
import moment from 'moment-jalaali';
import { ItemStatus, User, UserRole, TeamMember, TeamMemberRole } from './types';
import { getTodayString } from './constants';
import { supabase, handleSupabaseError } from './supabaseClient';
import { EditIcon, DeleteIcon, DetailsIcon, HistoryIcon, ThemeIcon, TableIcon, LightModeIcon, DarkModeIcon, PlusIcon, MinusIcon, GroupCollapsedIcon, DelegateIcon, PowerIcon, DocumentIcon } from './icons';
import { ActivityModal, SendApprovalModal, DelegateTaskModal, MassDelegateModal, CompletedTasksModal } from './modals';

// --- Reusable Collapsible Table Component ---
const CollapsibleTableSection = ({ title, count, children, iconType = 'plus-minus', defaultOpen = false, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const ToggleIcon = () => {
        if (iconType === 'plus-minus') {
            return isOpen ? <MinusIcon /> : <PlusIcon />;
        }
        // For 'equals-minus'
        return isOpen ? <MinusIcon /> : <GroupCollapsedIcon />;
    };

    if (React.Children.count(children) === 0) {
        return null;
    }

    return (
        <>
            <tr className="group-header-row" onClick={() => setIsOpen(!isOpen)} title={isOpen ? 'بستن گروه' : 'باز کردن گروه'}>
                <td colSpan={100}>
                    <span style={{ paddingRight: `${level * 24}px` }}>
                        <ToggleIcon />
                        <span className="group-header-title">{title}</span>
                        <span className="group-header-count">({count} مورد)</span>
                    </span>
                </td>
            </tr>
            {isOpen && children}
        </>
    );
};

const renderPriorityBadge = (priority) => {
    if (!priority) return '—';
    const priorityClass = {
        'کم': 'low',
        'متوسط': 'medium',
        'زیاد': 'high'
    }[priority] || 'medium';

    return <span className={`priority-badge priority-${priorityClass}`}>{priority}</span>;
};


// --- Dashboard Components ---

const AnimatedNumber = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const valueRef = React.useRef(0);

    useEffect(() => {
        const startValue = valueRef.current;
        const endValue = value;
        valueRef.current = endValue;
        
        let startTime = null;
        const duration = 500; // ms

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            const animatedValue = Math.floor(startValue + (endValue - startValue) * percentage);
            setDisplayValue(animatedValue);

            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);

    }, [value]);

    return <span className="stat-card-value">{displayValue}</span>;
};


const StatCard = ({ title, value, children }: { title: string; value?: React.ReactNode; children?: React.ReactNode }) => (
    <div className="dashboard-card stat-card">
        <h4 className="chart-title">{title}</h4>
        {children ? children : <div className="stat-card-value">{value}</div>}
    </div>
);

const PieChart = ({ data, isDonut = false, title }: { data: { name: string; value: number; color: string }[], isDonut?: boolean, title: string }) => {
    if (!data || data.length === 0 || data.every(d => d.value === 0)) {
        return <StatCard title={title}><p className="no-data-message">داده‌ای برای نمایش وجود ندارد</p></StatCard>;
    }
    
    const total = data.reduce((acc, item) => acc + item.value, 0);
    
    let cumulativePercent = 0;
    const gradientStops = data.map(item => {
        const percent = (item.value / total) * 100;
        const stop = `${item.color} ${cumulativePercent}% ${cumulativePercent + percent}%`;
        cumulativePercent += percent;
        return stop;
    }).join(', ');

    const gradient = `conic-gradient(${gradientStops})`;

    return (
        <div className="dashboard-card">
            <h4 className="chart-title">{title}</h4>
            <div className="pie-chart-container">
                <div className={`pie-chart ${isDonut ? 'donut' : ''}`} style={{ background: gradient }} role="img" aria-label={title}></div>
                <div className="pie-chart-legend">
                    {data.filter(item => item.value > 0).map(item => (
                        <div key={item.name} className="legend-item">
                            <span className="legend-color-box" style={{ backgroundColor: item.color }}></span>
                            <span className="legend-label">{item.name} ({item.value})</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const BarChart = ({ data, title, color, orientation = 'vertical' }: { data: { name: string; value: number }[], title: string, color: string, orientation?: 'vertical' | 'horizontal' }) => {
     if (!data || data.length === 0 || data.every(d => d.value === 0)) {
        return <div className="dashboard-card bar-chart-card"><h4 className="chart-title">{title}</h4><p className="no-data-message">داده‌ای برای نمایش وجود ندارد</p></div>;
    }
    const maxValue = Math.max(...data.map(item => item.value), 0);

    return (
        <div className={`dashboard-card bar-chart-card ${orientation}`}>
            <h4 className="chart-title">{title}</h4>
            <div className={`bar-chart-container ${orientation}`}>
                {data.map(item => (
                    <div key={item.name} className="bar-item">
                        <div className="bar-wrapper">
                            <div 
                                className="bar" 
                                style={{ 
                                    [orientation === 'vertical' ? 'height' : 'width']: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%',
                                    backgroundColor: color 
                                }}
                                title={`${item.name}: ${item.value}`}
                            >
                                {item.value > 0 && <span className="bar-value">{item.value}</span>}
                            </div>
                        </div>
                        <span className="bar-label">{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DashboardDataTable = ({ items }) => {
    if (items.length === 0) {
        return null; 
    }

    const projects = items.filter(item => item.type === 'پروژه');
    const actions = items.filter(item => item.type === 'اقدام');

    return (
        <div className="dashboard-card data-table-card">
             <h4 className="chart-title">لیست موارد فیلتر شده</h4>
            <div className="table-container">
                <table className="user-list-table dashboard-data-table">
                    <thead>
                        <tr>
                            <th>عنوان</th>
                            <th>مالک</th>
                            <th>مسئول</th>
                            <th>بخش</th>
                            <th>وضعیت</th>
                            <th>اهمیت</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.length > 0 && (
                            <CollapsibleTableSection title="پروژه‌ها" count={projects.length} defaultOpen={true}>
                                {projects.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.owner}</td>
                                        <td>{item.responsible}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.status}</td>
                                        <td>{renderPriorityBadge(item.priority)}</td>
                                    </tr>
                                ))}
                            </CollapsibleTableSection>
                        )}
                        {actions.length > 0 && (
                             <CollapsibleTableSection title="اقدامات" count={actions.length} defaultOpen={true}>
                                {actions.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.owner}</td>
                                        <td>{item.responsible}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.status}</td>
                                        <td>{renderPriorityBadge(item.priority)}</td>
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


export const DashboardPage = ({ projects, actions, currentUser, users, sections }) => {
    const [filters, setFilters] = useState({
        type: 'all',
        unit: 'all',
        responsible: 'all',
        status: 'all',
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const combinedItems = React.useMemo(() => {
        const projectItems = projects.map(p => ({
            id: `p-${p.id}`,
            name: p.projectName,
            type: 'پروژه',
            unit: p.unit,
            responsible: p.projectManager,
            owner: p.owner,
            status: p.status,
            activities: p.activities || [],
            startDate: p.projectStartDate,
            endDate: p.projectEndDate,
            priority: p.priority,
            approver: null, // Placeholder for consistent shape
        }));
        const actionItems = actions.map(a => ({
            id: `a-${a.id}`,
            name: a.title,
            type: 'اقدام',
            unit: a.unit,
            responsible: a.responsible,
            owner: a.owner,
            status: a.status === 'ارسال برای تایید' ? a.underlyingStatus : a.status,
            activities: [],
            startDate: a.startDate,
            endDate: a.endDate,
            priority: a.priority,
            approver: a.approver,
        }));
        return [...projectItems, ...actionItems];
    }, [projects, actions]);

    const userVisibleItems = React.useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.username === 'mahmoudi.pars@gmail.com') {
            return combinedItems;
        }
        return combinedItems.filter(item => 
            item.owner === currentUser.username ||
            item.responsible === currentUser.username ||
            item.approver === currentUser.username || // for actions
            (item.activities && item.activities.some(act => act.responsible === currentUser.username || act.approver === currentUser.username)) // for projects
        );
    }, [combinedItems, currentUser]);


    const filteredItems = React.useMemo(() => {
        return userVisibleItems.filter(item => {
            return (
                (filters.type === 'all' || item.type === filters.type) &&
                (filters.unit === 'all' || item.unit === filters.unit) &&
                (filters.responsible === 'all' || item.responsible === filters.responsible) &&
                (filters.status === 'all' || item.status === filters.status)
            );
        });
    }, [userVisibleItems, filters]);
    
    const notStartedCount = React.useMemo(() => {
        return filteredItems.filter(item => item.status === 'شروع نشده').length;
    }, [filteredItems]);
    
    const typeData = React.useMemo(() => {
        const counts = filteredItems.reduce((acc: Record<string, number>, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
        }, {});
        return [
            { name: 'پروژه', value: counts['پروژه'] || 0, color: '#e94560' },
            { name: 'اقدام', value: counts['اقدام'] || 0, color: '#17a2b8' },
        ];
    }, [filteredItems]);

    const statusData = React.useMemo(() => {
        const counts = filteredItems.reduce((acc: Record<string, number>, item) => {
            const status = item.status || 'نامشخص';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
         return [
            { name: 'شروع نشده', value: counts['شروع نشده'] || 0, color: '#888' },
            { name: 'در حال اجرا', value: counts['در حال اجرا'] || 0, color: '#ffc107' },
            { name: 'خاتمه یافته', value: counts['خاتمه یافته'] || 0, color: '#28a745' },
        ];
    }, [filteredItems]);

    const unitData = React.useMemo(() => {
        const counts = filteredItems.reduce<Record<string, number>>((acc, item) => {
            const unit = item.unit || 'نامشخص';
            acc[unit] = (acc[unit] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [filteredItems]);

    const responsibleData = React.useMemo(() => {
        const counts = filteredItems.reduce<Record<string, number>>((acc, item) => {
            if(item.responsible) {
                acc[item.responsible] = (acc[item.responsible] || 0) + 1;
            }
            return acc;
        }, {});
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [filteredItems]);

    const filterStatusOptions = ['شروع نشده', 'در حال اجرا', 'خاتمه یافته'];

    return (
        <div className="dashboard-page-container">
            <div className="dashboard-filters">
                <div className="filter-group">
                    <label htmlFor="type-filter">نوع</label>
                    <select id="type-filter" name="type" value={filters.type} onChange={handleFilterChange}>
                        <option value="all">همه</option>
                        <option value="پروژه">پروژه</option>
                        <option value="اقدام">اقدام</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="unit-filter">بخش</label>
                    <select id="unit-filter" name="unit" value={filters.unit} onChange={handleFilterChange}>
                        <option value="all">همه</option>
                        {sections.map(section => <option key={section} value={section}>{section}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="responsible-filter">مسئول</label>
                    <select id="responsible-filter" name="responsible" value={filters.responsible} onChange={handleFilterChange}>
                        <option value="all">همه</option>
                        {users.map(user => <option key={user.id} value={user.username}>{user.username}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="status-filter">وضعیت</label>
                    <select id="status-filter" name="status" value={filters.status} onChange={handleFilterChange}>
                        <option value="all">همه</option>
                        {filterStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </div>
            </div>
            <div className="dashboard-grid">
                <PieChart data={typeData} title="تفکیک بر اساس نوع" />
                <PieChart data={statusData} isDonut={true} title="تفکیک بر اساس وضعیت" />
                <StatCard title="خلاصه وضعیت">
                    <div className="stat-split-container">
                        <div className="stat-split-item">
                            <h4>تعداد کل</h4>
                            <AnimatedNumber value={filteredItems.length} />
                        </div>
                        <div className="stat-split-divider"></div>
                        <div className="stat-split-item">
                            <h4>شروع نشده</h4>
                            <AnimatedNumber value={notStartedCount} />
                        </div>
                    </div>
                </StatCard>
                <BarChart data={unitData} title="تفکیک بر اساس بخش" color="#e94560" />
                <BarChart data={responsibleData} title="تفکیک بر اساس مسئول" color="#17a2b8" orientation="horizontal" />
            </div>
            <DashboardDataTable items={filteredItems} />
        </div>
    );
};


// --- Original Page Components ---

export const LoginPage = ({ onLogin, onSignUp }: {
    onLogin: (user: Omit<User, 'password_hash'>) => void;
    onSignUp: (credentials: { username: string, password: string }) => Promise<{ data?: any; error?: any; }>;
}) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            if (isLoginView) {
                const { data: user, error: dbError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('username', username)
                    .eq('password_hash', password)
                    .single();

                if (dbError || !user) {
                    setError('نام کاربری یا رمز عبور اشتباه است.');
                    return;
                }

                if (user.is_active) {
                    const { password_hash, ...userToLogin } = user;
                    onLogin(userToLogin);
                } else {
                    setError('حساب کاربری شما غیرفعال است. لطفا با مدیر سیستم تماس بگیرید.');
                }
            } else {
                if (password !== confirmPassword) {
                    setError('رمز عبور و تکرار آن یکسان نیستند.');
                    return;
                }
                const { error: signUpError } = await onSignUp({ username, password });
                if (signUpError) {
                    setError(signUpError.message || 'خطا در ایجاد حساب کاربری.');
                } else {
                    setSuccessMessage('حساب کاربری با موفقیت ایجاد شد. اکنون می‌توانید وارد شوید.');
                    setIsLoginView(true);
                    setPassword('');
                    setConfirmPassword('');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError('');
        setSuccessMessage('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="login-container">
             {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-box">
                        <div className="spinner"></div>
                        <span>لطفا منتظر باشید...</span>
                    </div>
                </div>
            )}
            <form className="login-form" onSubmit={handleSubmit}>
                <img src="https://parspmi.ir/uploads/c140d7143d9b4d7abbe80a36585770bc.png" alt="ParsPMI Logo" className="login-logo" />
                <h2>{isLoginView ? 'ورود به سامانه' : 'ایجاد حساب کاربری'}</h2>
                {successMessage && <p className="success-message">{successMessage}</p>}
                <div className="input-group">
                    <label htmlFor="username">{isLoginView ? 'نام کاربری' : 'ایمیل'}</label>
                    <input 
                        type={isLoginView ? "text" : "email"} 
                        id="username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        placeholder={!isLoginView ? "ایمیل خود را وارد کنید" : ""}
                        required 
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="password">رمز عبور</label>
                    <input 
                        type="password" 
                        id="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder={!isLoginView ? "حداقل ۶ کارکتر" : ""}
                        required 
                    />
                </div>
                {!isLoginView && (
                    <div className="input-group">
                        <label htmlFor="confirm-password">تکرار رمز عبور</label>
                        <input 
                            type="password" 
                            id="confirm-password" 
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)} 
                            placeholder="رمز عبور را تکرار کنید"
                            required 
                        />
                    </div>
                )}
                <button type="submit" className="login-button">{isLoginView ? 'ورود' : 'ایجاد حساب'}</button>
                {error && <p className="error-message">{error}</p>}
                <div className="toggle-view">
                    <button type="button" onClick={toggleView}>
                        {isLoginView ? 'حساب کاربری ندارید؟ ثبت نام کنید' : 'حساب کاربری دارید؟ وارد شوید'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export const UserManagementPage = ({ users, onAddUser, onDeleteUser, onToggleUserActive, onEditUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleAddUser = (e: FormEvent) => {
        e.preventDefault();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(username)) {
            alert('لطفا یک ایمیل معتبر به عنوان نام کاربری وارد کنید.');
            return;
        }
        if (password !== confirmPassword) {
            alert('رمز عبور و تکرار آن یکسان نیستند.');
            return;
        }
        onAddUser({ username, password });
        setUsername('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="user-management-page">
            <form className="add-user-form" onSubmit={handleAddUser}>
                <h3>افزودن کاربر جدید</h3>
                <div className="input-group">
                    <label htmlFor="new-username">نام کاربری (ایمیل)</label>
                    <input type="email" id="new-username" value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
                <div className="input-group">
                    <label htmlFor="new-password">رمز عبور</label>
                    <input type="password" id="new-password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="input-group">
                    <label htmlFor="confirm-password">تکرار رمز عبور</label>
                    <input type="password" id="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <button type="submit" className="add-user-button">افزودن</button>
            </form>
            <table className="user-list-table">
                <thead>
                    <tr>
                        <th>نام کاربری</th>
                        <th>وضعیت</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.username}</td>
                            <td>
                                <span className={user.is_active ? 'status-active' : 'status-inactive'}>
                                    {user.is_active ? 'فعال' : 'غیرفعال'}
                                </span>
                            </td>
                            <td>
                                <div className="action-buttons">
                                    <button className="icon-btn edit-btn" title="ویرایش" onClick={() => onEditUser(user.id)}>
                                        <EditIcon />
                                    </button>
                                    <button
                                        className="icon-btn"
                                        title={user.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                                        onClick={() => onToggleUserActive(user.id)}
                                        style={{ color: user.is_active ? 'var(--c-warning)' : 'var(--c-success)' }}
                                    >
                                        <PowerIcon />
                                    </button>
                                    <button className="icon-btn delete-btn" title="حذف" onClick={() => onDeleteUser(user.id)} disabled={user.username === 'mahmoudi.pars@gmail.com'}>
                                        <DeleteIcon />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const ProjectDefinitionPage = ({ users, sections, onSave, projectToEdit, projects, onRequestConfirmation, onShowHistory, currentUser, teamMembers, onUpdateProject }) => {
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
    
    const possibleOwners = React.useMemo(() => {
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
            setProject({...initialProjectState, owner: currentUser.username });
        }
    }, [projectToEdit, currentUser]);
    
    const handleChange = (e) => {
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
    
    const handleEditActivity = (activity) => {
        setEditingActivity(activity);
        setIsActivityModalOpen(true);
    };

    const handleDeleteActivity = (activityId) => {
         const activityToDelete = project.activities.find(a => a.id === activityId);
         onRequestConfirmation({
            title: 'حذف فعالیت',
            message: `آیا از حذف فعالیت "${activityToDelete?.title}" اطمینان دارید؟`,
            onConfirm: async () => {
                const { error } = await supabase.from('activities').delete().eq('id', activityId);
                handleSupabaseError(error, 'deleting activity');
                if (!error) {
                    const updatedActivities = project.activities.filter(a => a.id !== activityId);
                    const updatedProject = { ...project, activities: updatedActivities };
                    setProject(updatedProject);
                    onUpdateProject(updatedProject);
                }
            }
        });
    };

    const handleSaveActivity = async (activityToSave) => {
        let updatedProject;
        if (activityToSave.id) { // Update
            const { data, error } = await supabase.from('activities').update(activityToSave).eq('id', activityToSave.id).select().single();
            handleSupabaseError(error, 'updating activity');
            if (data) {
                updatedProject = {
                    ...project,
                    activities: project.activities.map(a => a.id === data.id ? data : a)
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
                           {(project.activities || []).map(activity => (
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
                users={users}
                activityToEdit={editingActivity}
                teamMembers={teamMembers}
            />
        </div>
    );
};

export const ProjectsActionsListPage = ({ projects, actions, onViewDetails, onEditProject, onDeleteProject, onEditAction, onDeleteAction, currentUser, onShowHistory }) => {
    const [titleFilter, setTitleFilter] = useState('');
    const [unitFilter, setUnitFilter] = useState('all');
    const [responsibleFilter, setResponsibleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const allUnits = React.useMemo(() => [...new Set([...projects.map(p => p.unit), ...actions.map(a => a.unit)])], [projects, actions]);
    const allResponsibles = React.useMemo(() => [...new Set([...projects.map(p => p.projectManager), ...actions.map(a => a.responsible)])].filter(Boolean), [projects, actions]);
    const allStatuses = React.useMemo(() => ['شروع نشده', 'در حال اجرا', 'خاتمه یافته'], []);

    const groupedItems = React.useMemo(() => {
        const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
        
        const visibleProjects = isAdmin ? projects : projects.filter(p => 
            p.owner === currentUser.username ||
            p.projectManager === currentUser.username ||
            (p.activities && p.activities.some(act => act.responsible === currentUser.username || act.approver === currentUser.username))
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
        }, {});

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
                    {Object.keys(groupedItems).length > 0 ? (
                        Object.entries(groupedItems).sort((a, b) => a[0].localeCompare(b[0])).map(([type, unitGroups]) => {
                            const totalInType = Object.values(unitGroups).reduce((sum: number, items: any[]) => sum + items.length, 0);
                            return (
                                <CollapsibleTableSection key={type} title={type} count={totalInType} defaultOpen={true} level={0}>
                                    {Object.entries(unitGroups).sort((a, b) => a[0].localeCompare(b[0])).map(([unit, items]) => (
                                        <CollapsibleTableSection key={`${type}-${unit}`} title={`بخش: ${unit}`} count={items.length} defaultOpen={true} level={1}>
                                            {(items as any[]).map(item => {
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


export const TasksPage = ({ items, currentUser, onSendForApproval, onShowHistory, users, onDelegateTask, projects, actions, teamMembers, onMassDelegate, onViewDetails }) => {
    const [sendApprovalModal, setSendApprovalModal] = useState({ isOpen: false, item: null, requestedStatus: '' });
    const [delegateModal, setDelegateModal] = useState({ isOpen: false, item: null });
    const [isMassDelegateModalOpen, setIsMassDelegateModalOpen] = useState(false);
    const [isCompletedTasksModalOpen, setIsCompletedTasksModalOpen] = useState(false);
    
    if (!Array.isArray(items)) {
        return <p>خطا: داده‌های وظایف نامعتبر است.</p>;
    }
    
    const openTasks = items.filter(item => !(item.status === 'خاتمه یافته' && item.approvalStatus === 'approved'));
    const completedTasks = items.filter(item => item.status === 'خاتمه یافته' && item.approvalStatus === 'approved');

    const groupedOpenTasks = React.useMemo(() => {
        return openTasks.reduce((acc, task) => {
            const groupName = task.parentName || 'بدون پروژه/اقدام';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(task);
            return acc;
        }, {});
    }, [openTasks]);

    const handleSendForApproval = (item, requestedStatus) => {
        setSendApprovalModal({ isOpen: true, item, requestedStatus });
    };

    const handleConfirmSend = (extraData) => {
        onSendForApproval(sendApprovalModal.item, sendApprovalModal.requestedStatus, extraData);
        setSendApprovalModal({ isOpen: false, item: null, requestedStatus: '' });
    };

    const handleOpenDelegateModal = (item) => {
        setDelegateModal({ isOpen: true, item });
    };

    const handleConfirmDelegate = (newResponsibleUsername) => {
        onDelegateTask(delegateModal.item, newResponsibleUsername);
        setDelegateModal({ isOpen: false, item: null });
    };
    
    const handleSaveMassDelegation = (updates) => {
        onMassDelegate(updates);
        setIsMassDelegateModalOpen(false);
    };

    return (
        <div className="tasks-page">
            <div className="page-header-actions">
                <button className="header-action-btn" onClick={() => setIsMassDelegateModalOpen(true)}>
                    <DelegateIcon />
                    <span>تغییر واگذاری</span>
                </button>
                <button className="header-action-btn" onClick={() => setIsCompletedTasksModalOpen(true)}>
                    <HistoryIcon />
                    <span>فعالیتهای خاتمه یافته</span>
                </button>
            </div>
            <section>
                <h3 className="list-section-header">وظایف جاری ({openTasks.length})</h3>
                <table className="user-list-table">
                    <thead>
                        <tr>
                            <th>عنوان</th>
                            <th>تایید کننده</th>
                            <th>وضعیت تائید</th>
                            <th>وضعیت</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(groupedOpenTasks).length > 0 ? (
                            Object.entries(groupedOpenTasks).map(([groupName, tasks]) => (
                                <CollapsibleTableSection key={groupName} title={groupName} count={(tasks as any[]).length} defaultOpen={true}>
                                    {(tasks as any[]).map(item => {
                                        let approvalStatusText = '—';
                                        if (item.status === 'ارسال برای تایید') {
                                            approvalStatusText = `منتظر تایید (${item.requestedStatus})`;
                                        } else if (item.approvalStatus === 'approved') {
                                            approvalStatusText = 'تایید شده';
                                        } else if (item.approvalStatus === 'rejected') {
                                            approvalStatusText = 'رد شده';
                                        }

                                        return (
                                            <tr key={item.id}>
                                                <td>{item.title}</td>
                                                <td>{item.approver}</td>
                                                <td>{approvalStatusText}</td>
                                                <td>{item.status}</td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button className="icon-btn details-btn" title="جزئیات" onClick={() => onViewDetails(item)}>
                                                            <DetailsIcon />
                                                        </button>
                                                        <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(item.history)}>
                                                            <HistoryIcon />
                                                        </button>
                                                        <button className="icon-btn delegate-btn" title="واگذاری" onClick={() => handleOpenDelegateModal(item)}>
                                                            <DelegateIcon />
                                                        </button>
                                                        {item.status === 'شروع نشده' && (
                                                            <button className="send-approval-btn" onClick={() => handleSendForApproval(item, 'در حال اجرا')}>ارسال برای تایید شروع</button>
                                                        )}
                                                        {item.status === 'در حال اجرا' && (
                                                            <button className="send-approval-btn" onClick={() => handleSendForApproval(item, 'خاتمه یافته')}>ارسال برای تایید خاتمه</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </CollapsibleTableSection>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                                    هیچ وظیفه جاری برای شما ثبت نشده است.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>
            <SendApprovalModal 
                isOpen={sendApprovalModal.isOpen}
                onClose={() => setSendApprovalModal({ isOpen: false, item: null, requestedStatus: '' })}
                onSend={handleConfirmSend}
                requestedStatus={sendApprovalModal.requestedStatus}
            />
            <DelegateTaskModal
                isOpen={delegateModal.isOpen}
                onClose={() => setDelegateModal({ isOpen: false, item: null })}
                onDelegate={handleConfirmDelegate}
                item={delegateModal.item}
                users={users}
            />
            <MassDelegateModal
                isOpen={isMassDelegateModalOpen}
                onClose={() => setIsMassDelegateModalOpen(false)}
                onSave={handleSaveMassDelegation}
                projects={projects}
                actions={actions}
                teamMembers={teamMembers}
                currentUser={currentUser}
            />
            <CompletedTasksModal
                isOpen={isCompletedTasksModalOpen}
                onClose={() => setIsCompletedTasksModalOpen(false)}
                items={completedTasks}
            />
        </div>
    );
};

export const ApprovalsPage = ({ items, currentUser, onApprovalDecision, onShowHistory, onShowGlobalHistory, onViewDetails, onShowInfo }) => {
    
    if (!Array.isArray(items)) {
        return <p>خطا: داده‌های تاییدات نامعتبر است.</p>;
    }
    
    const pendingApprovals = items.filter(item => item.status === 'ارسال برای تایید');

    const groupedPendingApprovals = React.useMemo(() => {
        return pendingApprovals.reduce((acc, task) => {
            const groupName = task.parentName || 'بدون پروژه/اقدام';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(task);
            return acc;
        }, {});
    }, [pendingApprovals]);


    return (
        <div className="approvals-page">
            <div className="page-header-actions">
                <button className="header-action-btn" onClick={onShowGlobalHistory}>
                    <HistoryIcon />
                    <span>نمایش تاریخچه تاییدات من</span>
                </button>
            </div>
            <section>
                <h3 className="list-section-header">موارد در انتظار تایید ({pendingApprovals.length})</h3>
                <table className="user-list-table">
                    <thead>
                        <tr>
                            <th>عنوان</th>
                            <th>مسئول</th>
                            <th>درخواست برای</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(groupedPendingApprovals).length > 0 ? (
                             Object.entries(groupedPendingApprovals).map(([groupName, tasks]) => (
                                <CollapsibleTableSection key={groupName} title={groupName} count={(tasks as any[]).length} defaultOpen={true}>
                                    {(tasks as any[]).map(item => (
                                        <tr key={item.id}>
                                            <td>{item.title}</td>
                                            <td>{item.responsible}</td>
                                            <td>{item.requestedStatus}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="icon-btn" style={{color: 'var(--c-info)'}} title="اطلاعات ارسال" onClick={() => onShowInfo(item)}>
                                                        <DocumentIcon />
                                                    </button>
                                                    <button className="icon-btn details-btn" title="جزئیات" onClick={() => onViewDetails(item)}>
                                                        <DetailsIcon />
                                                    </button>
                                                    <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(item.history)}>
                                                        <HistoryIcon />
                                                    </button>
                                                    <button className="approve-btn" onClick={() => onApprovalDecision(item, 'approved')}>تایید</button>
                                                    <button className="reject-btn" onClick={() => onApprovalDecision(item, 'rejected')}>رد</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </CollapsibleTableSection>
                             ))
                        ) : (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                                    هیچ موردی در انتظار تایید شما نیست.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
};


export const SettingsPage = ({ theme, onThemeChange, sections, onAddSection, onUpdateSection, onDeleteSection, currentUser }) => {
    const [view, setView] = useState('theme'); // 'theme' or 'units'
    const [newSection, setNewSection] = useState('');
    const [editingSection, setEditingSection] = useState<{ old: string, new: string } | null>(null);

    const isAdmin = currentUser?.username === 'mahmoudi.pars@gmail.com';

    useEffect(() => {
        if (!isAdmin && view === 'units') {
            setView('theme');
        }
    }, [isAdmin, view]);

    const handleAddOrUpdateSection = () => {
        if (editingSection) {
            onUpdateSection(editingSection.old, editingSection.new);
            setEditingSection(null);
        } else {
            onAddSection(newSection);
            setNewSection('');
        }
    };

    const startEditing = (sectionName: string) => {
        setEditingSection({ old: sectionName, new: sectionName });
    };

    return (
        <div className="settings-page-container">
            <div className="settings-button-bar">
                <button className={`settings-view-btn ${view === 'theme' ? 'active' : ''}`} onClick={() => setView('theme')}>
                    <ThemeIcon />
                    <span>پوسته</span>
                </button>
                {isAdmin && (
                    <button className={`settings-view-btn ${view === 'units' ? 'active' : ''}`} onClick={() => setView('units')}>
                        <TableIcon />
                        <span>مدیریت بخشها</span>
                    </button>
                )}
            </div>
            <div className="settings-content-area">
                {view === 'theme' && (
                    <>
                        <h3 className="list-section-header">انتخاب پوسته برنامه</h3>
                        <div className="theme-selector">
                            <div className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => onThemeChange('dark')}>
                                <DarkModeIcon />
                                <span>تیره</span>
                            </div>
                            <div className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => onThemeChange('light')}>
                                <LightModeIcon />
                                <span>روشن</span>
                            </div>
                        </div>
                    </>
                )}
                 {view === 'units' && isAdmin && (
                    <>
                        <h3 className="list-section-header">مدیریت بخشهای سازمانی</h3>
                         <div className="unit-management-form">
                            <div className="input-group">
                               <label htmlFor="unit-name-input">نام بخش</label>
                               <input 
                                   id="unit-name-input"
                                   value={editingSection ? editingSection.new : newSection}
                                   onChange={e => editingSection ? setEditingSection({...editingSection, new: e.target.value}) : setNewSection(e.target.value)}
                               />
                            </div>
                            <button className="add-user-button" onClick={handleAddOrUpdateSection}>
                                {editingSection ? 'ذخیره تغییرات' : 'افزودن بخش'}
                            </button>
                            {editingSection && <button className="cancel-btn" onClick={() => setEditingSection(null)}>انصراف</button>}
                        </div>
                        <table className="user-list-table">
                            <thead>
                                <tr>
                                    <th>نام بخش</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sections.map(section => (
                                    <tr key={section}>
                                        <td>{section}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="icon-btn edit-btn" title="ویرایش" onClick={() => startEditing(section)}>
                                                    <EditIcon />
                                                </button>
                                                <button className="icon-btn delete-btn" title="حذف" onClick={() => onDeleteSection(section)}>
                                                    <DeleteIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
};

export const MyTeamPage = ({ allUsers, currentUser, teamMembers, onAddMember, onRemoveMember, onUpdateRole }: {
    allUsers: User[];
    currentUser: User | null;
    teamMembers: TeamMember[];
    onAddMember: (username: string, role: TeamMemberRole) => void;
    onRemoveMember: (username: string) => void;
    onUpdateRole: (username: string, role: TeamMemberRole) => void;
}) => {
    const [userToAdd, setUserToAdd] = useState('');

    const usersAvailableToAdd = React.useMemo(() => {
        if (!currentUser) return [];
        return allUsers.filter(u => !teamMembers.some(tm => tm.username === u.username));
    }, [allUsers, teamMembers]);
    
    const handleAddClick = () => {
        if (!userToAdd) return;
        
        const userExists = usersAvailableToAdd.some(u => u.username === userToAdd);
        if (userExists) {
            const role = userToAdd === currentUser.username ? 'ادمین' : 'عضو تیم';
            onAddMember(userToAdd, role);
            setUserToAdd('');
        } else {
            alert('لطفا یک کاربر معتبر از لیست انتخاب کنید یا نام کاربری را به درستی وارد کنید.');
        }
    };
    
    if (!currentUser) {
        return null;
    }

    return (
        <div className="user-management-page">
            <div className="add-user-form">
                <h3>افزودن عضو به تیم</h3>
                <div className="input-group">
                    <label htmlFor="team-user-input">انتخاب کاربر</label>
                     <input 
                        id="team-user-input"
                        list="team-user-suggestions"
                        value={userToAdd}
                        onChange={(e) => setUserToAdd(e.target.value)}
                        placeholder="نام کاربری را جستجو یا انتخاب کنید..."
                     />
                     <datalist id="team-user-suggestions">
                        {usersAvailableToAdd.map(u => <option key={u.id} value={u.username} />)}
                    </datalist>
                </div>
                <button className="add-user-button" onClick={handleAddClick} disabled={!userToAdd}>افزودن</button>
            </div>
            <table className="user-list-table">
                <thead>
                    <tr>
                        <th>نام کاربری</th>
                        <th>نقش در تیم</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    {teamMembers.map(member => {
                        const isCurrentUser = member.username === currentUser.username;
                        return (
                            <tr key={member.username}>
                                <td>{member.username}</td>
                                <td>
                                    <select 
                                        className="status-select"
                                        value={member.role} 
                                        onChange={e => onUpdateRole(member.username, e.target.value as TeamMemberRole)}
                                        disabled={isCurrentUser}
                                    >
                                        <option value="ادمین">ادمین</option>
                                        <option value="مدیر">مدیر</option>
                                        <option value="عضو تیم">عضو تیم</option>
                                    </select>
                                </td>
                                <td>
                                    <button 
                                        className="icon-btn delete-btn" 
                                        title={isCurrentUser ? "امکان حذف کاربر جاری از تیم وجود ندارد" : "حذف از تیم"} 
                                        onClick={() => onRemoveMember(member.username)}
                                        disabled={isCurrentUser}
                                    >
                                        <DeleteIcon />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};