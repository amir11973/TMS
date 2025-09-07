/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment-jalaali';
import { User, TeamMember } from '../types';
import { getTodayString } from '../constants';
import { JalaliDatePicker } from '../components';

export const ActionModal = ({ isOpen, onClose, onSave, users, sections, actionToEdit, currentUser, teamMembers, onRequestAlert }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (action: any) => void;
    users: User[];
    sections: string[];
    actionToEdit: any;
    currentUser: User;
    teamMembers: TeamMember[];
    onRequestAlert: (props: any) => void;
}) => {
    // FIX: Add `underlyingStatus` to initial state to match the object shape used later.
    const initialActionState = { title: '', owner: '', startDate: getTodayString(), endDate: getTodayString(), unit: sections[0] || '', responsible: '', approver: '', status: 'شروع نشده', priority: 'متوسط', underlyingStatus: null, use_workflow: true };
    const [action, setAction] = useState(initialActionState);
    
    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    const possibleOwners = React.useMemo(() => {
        if (!currentUser) return [];
        const ownerList = [{ username: currentUser.username }, ...teamMembers];
        const uniqueOwners = Array.from(new Set(ownerList.map(u => u.username)))
                                 .map(username => ({ username }));
        return uniqueOwners;
    }, [currentUser, teamMembers]);

    const responsibleUsers = teamMembers;
    const approverUsers = teamMembers.filter(m => m.role === 'مدیر' || m.role === 'ادمین');

    useEffect(() => {
        if (isOpen) {
            // FIX: Add `underlyingStatus` to initial state to match the object shape used later.
            const freshInitialState = { title: '', owner: '', startDate: getTodayString(), endDate: getTodayString(), unit: sections[0] || '', responsible: '', approver: '', status: 'شروع نشده', priority: 'متوسط', underlyingStatus: null, use_workflow: true };
            if (actionToEdit) {
                setAction({ ...freshInitialState, ...actionToEdit, owner: actionToEdit.owner || currentUser.username });
            } else {
                setAction({...freshInitialState, owner: currentUser.username });
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
        
        setAction(updatedAction);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(action);
    };

    const modalTitle = actionToEdit ? "ویرایش اقدام" : "تعریف اقدام جدید";
    const displayStatus = (action.status === 'ارسال برای تایید' && action.underlyingStatus) 
        ? action.underlyingStatus 
        : (action.status || 'شروع نشده');

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
                                <select name="owner" id="action-owner" value={action.owner} onChange={handleChange} required>
                                    <option value="" disabled>یک مالک انتخاب کنید</option>
                                    {possibleOwners.map(u => <option key={u.username} value={u.username}>{userMap.get(u.username) || u.username}</option>)}
                                </select>
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
                                <select name="responsible" id="action-responsible" value={action.responsible} onChange={handleChange} required>
                                    <option value="" disabled>یک کاربر انتخاب کنید</option>
                                    {responsibleUsers.map(user => <option key={user.username} value={user.username}>{userMap.get(user.username) || user.username}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label htmlFor="action-approver">تایید کننده</label>
                                <select name="approver" id="action-approver" value={action.approver} onChange={handleChange} required>
                                    <option value="" disabled>یک کاربر انتخاب کنید</option>
                                    {approverUsers.map(user => <option key={user.username} value={user.username}>{userMap.get(user.username) || user.username}</option>)}
                                </select>
                            </div>
                             <div className="input-group">
                                <label htmlFor="action-status">وضعیت</label>
                                <select name="status" id="action-status" value={displayStatus} onChange={handleChange} disabled>
                                    <option value="شروع نشده">شروع نشده</option>
                                    <option value="در حال اجرا">در حال اجرا</option>
                                    <option value="ارسال برای تایید">ارسال برای تایید</option>
                                    <option value="خاتمه یافته">خاتمه یافته</option>
                                </select>
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