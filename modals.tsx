/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, FormEvent } from 'react';
import { User, UserRole, TeamMember } from './types';
import { getTodayString } from './constants';
import { ProjectIcon, ActionIcon, EditIcon, DeleteIcon } from './icons';

export const ActivityModal = ({ isOpen, onClose, onSave, users, activityToEdit, teamMembers }) => {
    const initialActivityState = { title: '', startDate: getTodayString(), endDate: getTodayString(), responsible: '', approver: '' };
    
    const [activity, setActivity] = useState(initialActivityState);
    const responsibleUsers = teamMembers.filter(m => m.role === 'مدیر' || m.role === 'عضو تیم');
    const approverUsers = teamMembers.filter(m => m.role === 'مدیر' || m.role === 'ادمین');

    useEffect(() => {
        if (isOpen) {
            if (activityToEdit) {
                setActivity(activityToEdit);
            } else {
                setActivity(initialActivityState);
            }
        }
    }, [activityToEdit, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setActivity(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = (e) => {
        e.preventDefault();
        onSave(activity);
    };

    const modalTitle = activityToEdit ? "ویرایش فعالیت" : "تعریف فعالیت جدید";

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <div className="modal-header">
                        <h3>{modalTitle}</h3>
                        <button type="button" className="close-button" onClick={onClose}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <div className="input-group">
                            <label htmlFor="title">عنوان فعالیت</label>
                            <input name="title" id="title" value={activity.title} onChange={handleChange} required />
                        </div>
                        <div className="input-grid-col-2">
                             <div className="input-group">
                                <label htmlFor="startDate">شروع فعالیت</label>
                                <input type="date" name="startDate" id="startDate" value={activity.startDate} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label htmlFor="endDate">پایان فعالیت</label>
                                <input type="date" name="endDate" id="endDate" value={activity.endDate} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="input-group">
                            <label htmlFor="responsible">مسئول انجام</label>
                            <select name="responsible" id="responsible" value={activity.responsible} onChange={handleChange} required>
                                <option value="" disabled>یک کاربر انتخاب کنید</option>
                                {responsibleUsers.map(user => <option key={user.username} value={user.username}>{user.username}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label htmlFor="approver">تایید کننده</label>
                            <select name="approver" id="approver" value={activity.approver} onChange={handleChange} required>
                                <option value="" disabled>یک کاربر انتخاب کنید</option>
                                {approverUsers.map(user => <option key={user.username} value={user.username}>{user.username}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                        <button type="submit" className="save-btn">ذخیره</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const ActionModal = ({ isOpen, onClose, onSave, users, units, actionToEdit, currentUser, teamMembers }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (action: any) => void;
    users: User[];
    units: string[];
    actionToEdit: any;
    currentUser: User;
    teamMembers: TeamMember[];
}) => {
    const initialActionState = { title: '', owner: '', startDate: getTodayString(), endDate: getTodayString(), unit: units[0] || '', responsible: '', approver: '', status: 'شروع نشده', priority: 'متوسط' };
    const [action, setAction] = useState(initialActionState);

    const possibleOwners = React.useMemo(() => {
        if (!currentUser) return [];
        const ownerList = [{ username: currentUser.username }, ...teamMembers];
        const uniqueOwners = Array.from(new Set(ownerList.map(u => u.username)))
                                 .map(username => ({ username }));
        return uniqueOwners;
    }, [currentUser, teamMembers]);

    const responsibleUsers = teamMembers.filter(m => m.role === 'مدیر');
    const approverUsers = teamMembers.filter(m => m.role === 'مدیر' || m.role === 'ادمین');

    useEffect(() => {
        if (isOpen) {
            if (actionToEdit) {
                setAction({ ...initialActionState, ...actionToEdit, owner: actionToEdit.owner || currentUser.username });
            } else {
                setAction({...initialActionState, owner: currentUser.username });
            }
        }
    }, [isOpen, actionToEdit, currentUser]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAction(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = (e) => {
        e.preventDefault();
        onSave(action);
    };

    const modalTitle = actionToEdit ? "ویرایش اقدام" : "تعریف اقدام جدید";

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <div className="modal-header">
                        <h3>{modalTitle}</h3>
                        <button type="button" className="close-button" onClick={onClose}>&times;</button>
                    </div>
                    <div className="modal-body">
                         <div className="input-grid-col-2">
                            <div className="input-group">
                                <label htmlFor="action-title">عنوان اقدام</label>
                                <input name="title" id="action-title" value={action.title} onChange={handleChange} required />
                            </div>
                             <div className="input-group">
                                <label htmlFor="action-owner">مالک</label>
                                <select name="owner" id="action-owner" value={action.owner} onChange={handleChange} required>
                                    <option value="" disabled>یک مالک انتخاب کنید</option>
                                    {possibleOwners.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                                </select>
                            </div>
                        </div>
                         <div className="input-grid-col-2">
                             <div className="input-group">
                                <label htmlFor="action-startDate">تاریخ شروع</label>
                                <input type="date" name="startDate" id="action-startDate" value={action.startDate} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label htmlFor="action-endDate">تاریخ پایان</label>
                                <input type="date" name="endDate" id="action-endDate" value={action.endDate} onChange={handleChange} required />
                            </div>
                        </div>
                         <div className="input-group">
                            <label htmlFor="action-unit">واحد متولی</label>
                            <select name="unit" id="action-unit" value={action.unit} onChange={handleChange} required>
                                <option value="" disabled>یک واحد انتخاب کنید</option>
                                {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label htmlFor="action-priority">درجه اهمیت</label>
                            <select name="priority" id="action-priority" value={action.priority} onChange={handleChange} required>
                                <option value="کم">کم</option>
                                <option value="متوسط">متوسط</option>
                                <option value="زیاد">زیاد</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label htmlFor="action-status">وضعیت</label>
                            <select name="status" id="action-status" value={action.status || 'شروع نشده'} onChange={handleChange} disabled>
                                <option value="شروع نشده">شروع نشده</option>
                                <option value="در حال اجرا">در حال اجرا</option>
                                <option value="ارسال برای تایید">ارسال برای تایید</option>
                                <option value="خاتمه یافته">خاتمه یافته</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label htmlFor="action-responsible">مسئول انجام</label>
                            <select name="responsible" id="action-responsible" value={action.responsible} onChange={handleChange} required>
                                <option value="" disabled>یک کاربر انتخاب کنید</option>
                                {responsibleUsers.map(user => <option key={user.username} value={user.username}>{user.username}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label htmlFor="action-approver">تایید کننده</label>
                            <select name="approver" id="action-approver" value={action.approver} onChange={handleChange} required>
                                <option value="" disabled>یک کاربر انتخاب کنید</option>
                                {approverUsers.map(user => <option key={user.username} value={user.username}>{user.username}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                        <button type="submit" className="save-btn">ذخیره اطلاعات</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const SendApprovalModal = ({ isOpen, onClose, onSend, requestedStatus }) => {
    const [comment, setComment] = useState('');
    const [file, setFile] = useState<File | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSend = () => {
        onSend({ comment, fileName: file ? file.name : null });
        setComment('');
        setFile(null);
    };
    
    const handleClose = () => {
        setComment('');
        setFile(null);
        onClose();
    }
    
    let title = "ارسال برای تایید";
    if (requestedStatus === 'در حال اجرا') {
        title = "ارسال برای تایید شروع";
    } else if (requestedStatus === 'خاتمه یافته') {
        title = "ارسال برای تایید خاتمه";
    }


    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="close-button" onClick={handleClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="input-group">
                        <label htmlFor="approval-comment">توضیحات (اختیاری)</label>
                        <textarea 
                            id="approval-comment" 
                            rows={4} 
                            value={comment} 
                            onChange={e => setComment(e.target.value)}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="approval-file">الصاق فایل (اختیاری)</label>
                        <input 
                            type="file" 
                            id="approval-file" 
                            onChange={handleFileChange}
                        />
                        {file && <span className="file-name-display">{file.name}</span>}
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={handleClose}>انصراف</button>
                    <button type="button" className="save-btn" onClick={handleSend}>ارسال</button>
                </div>
            </div>
        </div>
    );
};

export const DetailsModal = ({ isOpen, onClose, item }) => {
    if (!isOpen) return null;

    const isProject = item.type === 'project';
    const displayStatus = isProject ? item.status : (item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status);
    const priority = item?.priority || 'متوسط';
    const priorityClass = {
        'کم': 'low',
        'متوسط': 'medium',
        'زیاد': 'high'
    }[priority];

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content details-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>جزئیات {isProject ? 'پروژه' : 'اقدام'}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-group">
                            <span className="detail-label">عنوان</span>
                            <span className="detail-value">{isProject ? item.projectName : item.title}</span>
                        </div>
                         <div className="detail-group">
                            <span className="detail-label">مالک</span>
                            <span className="detail-value">{item.owner}</span>
                        </div>
                        <div className="detail-group">
                            <span className="detail-label">{isProject ? 'مدیر پروژه' : 'مسئول'}</span>
                            <span className="detail-value">{isProject ? item.projectManager : item.responsible}</span>
                        </div>
                        <div className="detail-group">
                            <span className="detail-label">وضعیت</span>
                            <span className="detail-value">{displayStatus}</span>
                        </div>
                         <div className="detail-group">
                            <span className="detail-label">درجه اهمیت</span>
                            <span className="detail-value">
                                <span className={`priority-badge priority-${priorityClass}`}>{priority}</span>
                            </span>
                        </div>
                        <div className="detail-group">
                            <span className="detail-label">واحد متولی</span>
                            <span className="detail-value">{item.unit}</span>
                        </div>
                        <div className="detail-group">
                            <span className="detail-label">تاریخ شروع</span>
                            <span className="detail-value">{isProject ? item.projectStartDate : item.startDate}</span>
                        </div>
                        <div className="detail-group">
                            <span className="detail-label">تاریخ پایان</span>
                            <span className="detail-value">{isProject ? item.projectEndDate : item.endDate}</span>
                        </div>
                        {isProject && (
                             <div className="detail-group full-width">
                                <span className="detail-label">هدف پروژه</span>
                                <p className="detail-value">{item.projectGoal || 'ثبت نشده'}</p>
                            </div>
                        )}
                    </div>
                    {isProject && item.activities && (
                        <>
                            <h4 className="list-section-header">فعالیت‌های پروژه</h4>
                            <table className="user-list-table">
                                <thead>
                                    <tr>
                                        <th>عنوان</th>
                                        <th>مسئول</th>
                                        <th>تایید کننده</th>
                                        <th>وضعیت</th>
                                        <th>وضعیت تائید</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {item.activities.map(act => {
                                        const isPendingApproval = act.status === 'ارسال برای تایید';
                                        const effectiveStatus = isPendingApproval ? act.underlyingStatus : act.status;
                                        
                                        let approvalWorkflowStatus = '—';
                                        if (isPendingApproval) {
                                            approvalWorkflowStatus = `منتظر تائید (${act.requestedStatus})`;
                                        } else if (act.approvalStatus === 'approved') {
                                            approvalWorkflowStatus = 'تایید شده';
                                        } else if (act.approvalStatus === 'rejected') {
                                            approvalWorkflowStatus = 'رد شده';
                                        }

                                        return (
                                            <tr key={act.id}>
                                                <td>{act.title}</td>
                                                <td>{act.responsible}</td>
                                                <td>{act.approver}</td>
                                                <td>{effectiveStatus}</td>
                                                <td>{approvalWorkflowStatus}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ApprovalInfoModal = ({ isOpen, onClose, item }) => {
    if (!isOpen || !item) return null;

    const approvalRequestInfo = [...(item.history || [])].reverse().find(
        (h) => h.status === 'ارسال برای تایید' && h.requestedStatus === item.requestedStatus
    );

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>اطلاعات ارسال برای تایید</h3>
                    <button type="button" className="close-button" onClick={onClose}>
                        &times;
                    </button>
                </div>
                <div className="modal-body">
                    <div className="detail-group full-width">
                        <span className="detail-label">مورد</span>
                        <p className="detail-value">{item.title}</p>
                    </div>
                    <div className="detail-group full-width">
                        <span className="detail-label">توضیحات ارسال کننده</span>
                        <p className="detail-value">
                            {approvalRequestInfo?.comment || 'توضیحاتی ثبت نشده است.'}
                        </p>
                    </div>
                    <div className="detail-group full-width">
                        <span className="detail-label">سند الصاق شده</span>
                        <p className="detail-value">
                            {approvalRequestInfo?.fileName || 'سندی الصاق نشده است.'}
                        </p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
};

export const HistoryModal = ({ isOpen, onClose, history }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>تاریخچه تغییرات</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {history && history.slice().reverse().map((entry, index) => {
                         let approvalStatusText = '';
                         if (entry?.status === 'ارسال برای تایید') {
                             approvalStatusText = 'ارسال شده برای تایید';
                         } else if (entry?.approvalDecision === 'approved') {
                             approvalStatusText = 'تایید شده';
                         } else if (entry?.approvalDecision === 'rejected') {
                             approvalStatusText = 'رد شده';
                         }
                        
                        return (
                            <div className="history-detail-item" key={index}>
                               {entry.parentTitle && <p><strong>مورد:</strong> {entry.parentTitle}</p>}
                               <p><strong>وضعیت:</strong> {entry?.status ?? 'نامشخص'} {entry?.requestedStatus ? `(درخواست برای ${entry.requestedStatus})` : ''}</p>
                               {approvalStatusText && <p><strong>وضعیت تایید:</strong> {approvalStatusText}</p>}
                               <p><strong>کاربر:</strong> {entry?.user ?? 'نامشخص'}</p>
                               <p><strong>تاریخ:</strong> {entry?.date ? new Date(entry.date).toLocaleString('fa-IR') : 'نامشخص'}</p>
                               {entry?.comment && <p><strong>توضیحات:</strong> {entry.comment}</p>}
                               {entry?.details && <p><strong>جزئیات:</strong> {entry.details}</p>}
                               {entry?.fileName && <p><strong>فایل:</strong> {entry.fileName}</p>}
                               <hr style={{border: '1px solid var(--c-border)', margin: '10px 0'}}/>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content confirmation-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="confirmation-message">{message}</p>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                    <button type="button" className="confirm-btn-danger" onClick={onConfirm}>تایید</button>
                </div>
            </div>
        </div>
    );
};

export const ApprovalDecisionModal = ({ isOpen, onClose, onConfirm, decisionType }) => {
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (isOpen) {
            setComment('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(comment);
    };

    const title = decisionType === 'approved' ? 'تایید آیتم' : 'رد آیتم';
    const message = decisionType === 'approved' 
        ? 'آیا از تایید این مورد اطمینان دارید؟' 
        : 'آیا از رد این مورد اطمینان دارید؟';

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p style={{marginBottom: '16px'}}>{message}</p>
                    <div className="input-group">
                        <label htmlFor="decision-comment">توضیحات (اختیاری)</label>
                        <textarea 
                            id="decision-comment" 
                            rows={4} 
                            value={comment} 
                            onChange={e => setComment(e.target.value)}
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                    <button 
                        type="button" 
                        className={decisionType === 'approved' ? 'approve-btn' : 'reject-btn'} 
                        onClick={handleConfirm}
                    >
                        {decisionType === 'approved' ? 'تایید' : 'رد'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ChoiceModal = ({ isOpen, onClose, onProject, onAction }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content choice-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>تعریف مورد جدید</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="choice-message">قصد تعریف کدام مورد را دارید؟</p>
                </div>
                <div className="modal-footer choice-footer">
                    <button type="button" className="choice-btn" onClick={onProject}>
                        <ProjectIcon />
                        <span>پروژه</span>
                    </button>
                    <button type="button" className="choice-btn" onClick={onAction}>
                        <ActionIcon />
                        <span>اقدام</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export const DelegateTaskModal = ({ isOpen, onClose, onDelegate, item, users }) => {
    const [selectedUser, setSelectedUser] = useState('');

    useEffect(() => {
        if (item && users) {
            const otherUsers = users.filter(u => u.username !== item.responsible);
            if (otherUsers.length > 0) {
                setSelectedUser(otherUsers[0].username);
            } else {
                setSelectedUser('');
            }
        }
    }, [item, users]);
    
    if (!isOpen) return null;

    const handleDelegate = () => {
        if (selectedUser) {
            onDelegate(selectedUser);
        }
    };

    const availableUsers = users.filter(u => u.username !== item.responsible);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>واگذاری مسئولیت</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p style={{marginBottom: '16px'}}>واگذاری مسئولیت آیتم: <strong>{item?.title}</strong></p>
                    {availableUsers.length > 0 ? (
                        <div className="input-group">
                            <label htmlFor="delegate-user">کاربر جدید</label>
                            <select 
                                id="delegate-user"
                                value={selectedUser}
                                onChange={e => setSelectedUser(e.target.value)}
                                required
                            >
                                {availableUsers.map(user => (
                                    <option key={user.id} value={user.username}>{user.username}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <p>کاربر دیگری برای واگذاری مسئولیت وجود ندارد.</p>
                    )}
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                    <button 
                        type="button" 
                        className="save-btn" 
                        onClick={handleDelegate}
                        disabled={!selectedUser || availableUsers.length === 0}
                    >
                        واگذاری
                    </button>
                </div>
            </div>
        </div>
    );
};

export const UserEditModal = ({ isOpen, onClose, onSave, userToEdit }) => {
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (userToEdit) {
            setPassword(''); // Reset password on open
        }
    }, [userToEdit]);

    if (!isOpen || !userToEdit) return null;

    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        const updatedData: any = { ...userToEdit };
        if (password) {
            updatedData.new_password = password;
        }
        onSave(updatedData);
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <div className="modal-header">
                        <h3>ویرایش کاربر: {userToEdit.username}</h3>
                        <button type="button" className="close-button" onClick={onClose}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <div className="input-group">
                            <label htmlFor="edit-username">نام کاربری</label>
                            <input id="edit-username" value={userToEdit.username} disabled />
                        </div>
                        <div className="input-group">
                            <label htmlFor="edit-password">رمز عبور جدید</label>
                            <input 
                                type="password" 
                                id="edit-password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                placeholder="برای عدم تغییر، خالی بگذارید" 
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                        <button type="submit" className="save-btn">ذخیره</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const MassDelegateModal = ({ isOpen, onClose, onSave, projects, actions, teamMembers, currentUser }) => {
    const [changes, setChanges] = useState({});

    const delegatableItems = React.useMemo(() => {
        if (!currentUser) return [];
        const projectActivities = projects
            .filter(p => p.projectManager === currentUser.username)
            .flatMap(p => p.activities.map(a => ({ 
                ...a, 
                type: 'activity', 
                parentName: p.projectName,
                itemName: a.title,
            })));

        const manageableActions = actions
            .filter(a => a.approver === currentUser.username)
            .map(a => ({
                ...a,
                type: 'action',
                parentName: 'اقدام مستقل',
                itemName: a.title,
            }));

        return [...projectActivities, ...manageableActions];
    }, [projects, actions, currentUser]);

    const assignableUsers = React.useMemo(() => {
        return teamMembers.filter(m => m.role === 'مدیر' || m.role === 'عضو تیم');
    }, [teamMembers]);

    useEffect(() => {
        if (isOpen) {
            setChanges({});
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelectChange = (itemId, newResponsible) => {
        setChanges(prev => ({ ...prev, [itemId]: newResponsible }));
    };

    const handleSave = () => {
        const updates = Object.entries(changes).map(([itemId, newResponsible]) => {
            const item = delegatableItems.find(i => i.id === Number(itemId));
            return {
                itemId: Number(itemId),
                itemType: item.type,
                newResponsible: newResponsible as string,
            };
        });
        onSave(updates);
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>تغییر واگذاری گروهی</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="table-container" style={{ maxHeight: '60vh' }}>
                        <table className="user-list-table">
                            <thead>
                                <tr>
                                    <th>پروژه / اقدام</th>
                                    <th>فعالیت / عنوان</th>
                                    <th>مسئول فعلی</th>
                                    <th>مسئول جدید</th>
                                </tr>
                            </thead>
                            <tbody>
                                {delegatableItems.length > 0 ? delegatableItems.map(item => {
                                    const isPendingApproval = item.status === 'ارسال برای تایید';
                                    return (
                                        <tr key={`${item.type}-${item.id}`}>
                                            <td>{item.parentName}</td>
                                            <td>{item.itemName}</td>
                                            <td>{item.responsible}</td>
                                            <td>
                                                <select
                                                    className="status-select"
                                                    value={changes[item.id] || item.responsible}
                                                    onChange={(e) => handleSelectChange(item.id, e.target.value)}
                                                    disabled={isPendingApproval}
                                                    title={isPendingApproval ? "امکان تغییر واگذاری در وضعیت منتظر تایید وجود ندارد" : ""}
                                                >
                                                    <option value={item.responsible}>{item.responsible}</option>
                                                    {assignableUsers
                                                        .filter(u => u.username !== item.responsible)
                                                        .map(user => (
                                                            <option key={user.username} value={user.username}>{user.username}</option>
                                                        ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center' }}>موردی برای واگذاری یافت نشد.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                    <button type="button" className="save-btn" onClick={handleSave} disabled={Object.keys(changes).length === 0}>
                        ذخیره تغییرات
                    </button>
                </div>
            </div>
        </div>
    );
};

export const CompletedTasksModal = ({ isOpen, onClose, items }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>فعالیت‌های خاتمه یافته</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="table-container" style={{ maxHeight: '60vh' }}>
                        <table className="user-list-table">
                            <thead>
                                <tr>
                                    <th>عنوان</th>
                                    <th>پروژه / اقدام</th>
                                    <th>تاریخ پایان</th>
                                    <th>تاریخ تایید نهایی</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length > 0 ? items.map(item => {
                                    const finalApprovalEntry = item.history?.slice().reverse().find(h => h.approvalDecision === 'approved' && h.status === 'خاتمه یافته');
                                    const finalApprovalDate = finalApprovalEntry ? new Date(finalApprovalEntry.date).toLocaleDateString('fa-IR') : '—';
                                    
                                    return (
                                        <tr key={`${item.type}-${item.id}`}>
                                            <td>{item.title}</td>
                                            <td>{item.parentName}</td>
                                            <td>{item.endDate}</td>
                                            <td>{finalApprovalDate}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center' }}>هیچ فعالیت خاتمه یافته‌ای یافت نشد.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>بستن</button>
                </div>
            </div>
        </div>
    );
};