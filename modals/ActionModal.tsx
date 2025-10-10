/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment-jalaali';
import { User, TeamMember, CustomField } from '../types';
import { getTodayString } from '../constants';
import { JalaliDatePicker, renderStatusBadge } from '../components';

export const ActionModal = ({ isOpen, onClose, onSave, users, sections, actionToEdit, currentUser, teamMembers, onRequestAlert, customFields }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (action: any) => void;
    users: User[];
    sections: string[];
    actionToEdit: any;
    currentUser: User;
    teamMembers: TeamMember[];
    onRequestAlert: (props: any) => void;
    customFields: CustomField[];
}) => {
    // FIX: Add `underlyingStatus` to initial state to match the object shape used later.
    // FIX: Add 'requestedStatus' and 'approvalStatus' to the initial state to prevent type errors.
    const initialActionState = { title: '', owner: '', startDate: getTodayString(), endDate: getTodayString(), unit: sections[0] || '', responsible: '', approver: '', status: 'شروع نشده', priority: 'متوسط', underlyingStatus: null, requestedStatus: null, approvalStatus: null, use_workflow: true };
    const [action, setAction] = useState(initialActionState);
    const [customValues, setCustomValues] = useState<Record<string, any>>({});
    
    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    const responsibleUsers = useMemo(() => {
        if (!currentUser) return [];
        const teamUsernames = new Set(teamMembers.map(m => m.username));
        // The list should include the manager (currentUser) and their team members.
        return users.filter(u => u.username === currentUser.username || teamUsernames.has(u.username));
    }, [users, teamMembers, currentUser]);

    const approverUsers = useMemo(() => {
        if (!currentUser) return [];
        const managerAndAdminUsernames = new Set(
            teamMembers
                .filter(m => m.role === 'ادمین' || m.role === 'مدیر')
                .map(m => m.username)
        );
        // The manager (currentUser) can always be an approver.
        managerAndAdminUsernames.add(currentUser.username);
        return users.filter(u => managerAndAdminUsernames.has(u.username));
    }, [users, teamMembers, currentUser]);

    const isNew = !actionToEdit;

    const relevantCustomFields = useMemo(() => {
        if (!currentUser) return [];
        const actionCustomFields = customFields.filter(f => f.field_group === 'action');

        if (isNew) {
            // For new items, only show fields the current user created.
            return actionCustomFields
                .filter(f => f.owner_username === currentUser.username)
                .map(f => ({ ...f, isReadOnly: false }));
        } else {
            // For existing items, show a combination.
            const currentCustomValues = actionToEdit?.custom_field_values || {};
            
            return actionCustomFields
                .map(field => {
                    const isOwner = field.owner_username === currentUser.username;
                    const hasValue = currentCustomValues.hasOwnProperty(field.id);
                    const isPublic = !field.is_private;

                    if (isOwner) {
                        // Owner can always see and edit their fields.
                        return { ...field, isReadOnly: false };
                    }
                    if (isPublic && hasValue) {
                        // Others can see public fields if they have a value.
                        return { ...field, isReadOnly: true };
                    }
                    // Private fields of others, or public fields without a value are not shown.
                    return null;
                })
                .filter((field): field is CustomField & { isReadOnly: boolean } => field !== null);
        }
    }, [customFields, currentUser, actionToEdit, isNew]);

    useEffect(() => {
        if (isOpen) {
            // FIX: Add `underlyingStatus` to initial state to match the object shape used later.
            // FIX: Add 'requestedStatus' and 'approvalStatus' to the initial state to prevent type errors.
            const freshInitialState = { title: '', owner: '', startDate: getTodayString(), endDate: getTodayString(), unit: sections[0] || '', responsible: '', approver: '', status: 'شروع نشده', priority: 'متوسط', underlyingStatus: null, requestedStatus: null, approvalStatus: null, use_workflow: true };
            if (actionToEdit) {
                setAction({ ...freshInitialState, ...actionToEdit });
                setCustomValues(actionToEdit.custom_field_values || {});
            } else {
                setAction({
                    ...freshInitialState, 
                    owner: currentUser.username,
                    responsible: currentUser.username,
                    approver: currentUser.username
                });
                setCustomValues({});
            }
        }
    }, [isOpen, actionToEdit, currentUser, sections]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'endDate' && moment(value).isBefore(action.startDate)) {
            onRequestAlert({
                title: 'تاریخ نامعتبر',
                message: 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.'
            });
            return; // Prevent state update
        }

        const updatedAction = { ...action, [name]: value };

        // If start date changes and is after end date, update end date to match.
        if (name === 'startDate' && moment(updatedAction.endDate).isBefore(value)) {
            updatedAction.endDate = value;
        }
        
        if (name === 'status' && currentUser?.username === 'mahmoudi.pars@gmail.com') {
            updatedAction.underlyingStatus = null;
            updatedAction.requestedStatus = null;
            updatedAction.approvalStatus = null;
        }

        setAction(updatedAction);
    };

    const handleCustomValueChange = (fieldId: number, value: string) => {
        setCustomValues(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...action, custom_field_values: customValues });
    };

    const modalTitle = actionToEdit ? "ویرایش اقدام" : "تعریف اقدام جدید";
    const displayStatus = (action.status === 'ارسال برای تایید' && action.underlyingStatus) 
        ? action.underlyingStatus 
        : (action.status || 'شروع نشده');

    const isOwner = currentUser.username === action.owner;
    const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content action-modal-content" onClick={e => e.stopPropagation()}>
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
                                <input 
                                    id="action-owner"
                                    value={userMap.get(action.owner) || action.owner}
                                    disabled
                                />
                            </div>
                             <div className="input-group">
                                <label htmlFor="action-startDate">تاریخ شروع</label>
                                <JalaliDatePicker name="startDate" id="action-startDate" value={action.startDate} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label htmlFor="action-endDate">تاریخ پایان</label>
                                <JalaliDatePicker name="endDate" id="action-endDate" value={action.endDate} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label htmlFor="action-unit">بخش</label>
                                <select name="unit" id="action-unit" value={action.unit} onChange={handleChange} required>
                                    <option value="" disabled>یک بخش انتخاب کنید</option>
                                    {sections.map(section => <option key={section} value={section}>{section}</option>)}
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
                                <label htmlFor="action-responsible">مسئول انجام</label>
                                <select name="responsible" id="action-responsible" value={action.responsible} onChange={handleChange} required disabled={!isOwner && !isNew}>
                                    <option value="" disabled>یک کاربر انتخاب کنید</option>
                                    {responsibleUsers.map(user => <option key={user.username} value={user.username}>{userMap.get(user.username) || user.username}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label htmlFor="action-approver">تایید کننده</label>
                                <select name="approver" id="action-approver" value={action.approver} onChange={handleChange} required disabled={(!isOwner && !isNew) || !action.use_workflow}>
                                    <option value="" disabled>یک کاربر انتخاب کنید</option>
                                    {approverUsers.map(user => <option key={user.username} value={user.username}>{userMap.get(user.username) || user.username}</option>)}
                                </select>
                            </div>
                             <div className="input-group">
                                <label htmlFor="action-status">وضعیت</label>
                                {isAdmin ? (
                                    <select name="status" id="action-status" value={displayStatus} onChange={handleChange}>
                                        <option value="شروع نشده">شروع نشده</option>
                                        <option value="در حال اجرا">در حال اجرا</option>
                                        <option value="خاتمه یافته">خاتمه یافته</option>
                                    </select>
                                ) : (
                                    renderStatusBadge(displayStatus)
                                )}
                            </div>
                             <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input 
                                    type="checkbox" 
                                    name="use_workflow" 
                                    id="action-use_workflow" 
                                    checked={action.use_workflow} 
                                    onChange={e => setAction(prev => ({ ...prev, use_workflow: e.target.checked }))} 
                                    style={{ width: 'auto' }}
                                />
                                <label htmlFor="action-use_workflow" style={{ marginBottom: 0, userSelect: 'none' }}>استفاده از گردش کار تاییدات</label>
                            </div>
                        </div>
                        {relevantCustomFields.length > 0 && <h4 className="list-section-header" style={{marginTop: '1.5rem', marginBottom: '1rem'}}>فیلدهای سفارشی</h4>}
                        {relevantCustomFields.map(field => (
                            <div className="input-group" key={field.id}>
                                <label htmlFor={`custom-field-${field.id}`}>{field.title}</label>
                                <input
                                    id={`custom-field-${field.id}`}
                                    value={customValues[field.id] || ''}
                                    onChange={e => !field.isReadOnly && handleCustomValueChange(field.id, e.target.value)}
                                    readOnly={field.isReadOnly}
                                />
                            </div>
                        ))}
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