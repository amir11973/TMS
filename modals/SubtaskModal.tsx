/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment-jalaali';
import { User } from '../types';
import { JalaliDatePicker, renderPriorityBadge, renderStatusBadge } from '../components';
import { getTodayString } from '../constants';
import { toPersianDigits } from '../utils';

export const SubtaskModal = ({ isOpen, onClose, parentItem, responsibleUsers, approverUsers, currentUser, users, onSave, allActivities, allActions, onRequestAlert }: {
    isOpen: boolean;
    onClose: () => void;
    parentItem: any;
    responsibleUsers: User[];
    approverUsers: User[];
    currentUser: User | null;
    users: User[];
    onSave: (subtask: any) => void;
    allActivities: any[];
    allActions: any[];
    onRequestAlert: (props: any) => void;
}) => {
    const initialSubtaskState = {
        title: '',
        responsible: '',
        approver: '',
        startDate: getTodayString(),
        endDate: getTodayString(),
        priority: 'متوسط'
    };
    const [newSubtask, setNewSubtask] = useState(initialSubtaskState);
    
    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);
    
    const subtasks = useMemo(() => {
        if (!parentItem) return [];
        const source = parentItem.type === 'activity' ? allActivities : allActions;
        return source.filter(item => item.parent_id === parentItem.id);
    }, [parentItem, allActivities, allActions]);
    
    useEffect(() => {
        if (isOpen && parentItem && currentUser) {
            const today = getTodayString();
            const parentStart = parentItem.startDate;
            const parentEnd = parentItem.endDate;
            setNewSubtask({
                ...initialSubtaskState,
                approver: currentUser.username,
                startDate: moment(today).isBefore(parentStart) ? parentStart : today,
                endDate: moment(today).isBefore(parentStart) ? parentStart : today,
            });
        }
    }, [isOpen, parentItem, currentUser]);

    if (!isOpen || !parentItem) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Parent date range validation
        if ((name === 'startDate' || name === 'endDate')) {
            if (moment(value).isBefore(parentItem.startDate) || moment(value).isAfter(parentItem.endDate)) {
                onRequestAlert({
                    title: 'تاریخ نامعتبر',
                    message: `تاریخ زیرفعالیت باید بین تاریخ شروع (${moment(parentItem.startDate).format('jYYYY/jMM/jDD')}) و پایان (${moment(parentItem.endDate).format('jYYYY/jMM/jDD')}) فعالیت اصلی باشد.`
                });
                return;
            }
        }
        
        const updatedSubtask = { ...newSubtask, [name]: value };
        
        // If start date is moved after end date, move end date as well
        if (name === 'startDate' && moment(newSubtask.endDate).isBefore(value)) {
            updatedSubtask.endDate = value;
        }

        // If end date is moved before start date, show an error
        if (name === 'endDate' && moment(newSubtask.startDate).isAfter(value)) {
            onRequestAlert({
                title: 'تاریخ نامعتبر',
                message: 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.'
            });
            return;
        }

        setNewSubtask(updatedSubtask);
    };

    const handleAddSubtask = () => {
        if (!newSubtask.title || !newSubtask.responsible) {
            onRequestAlert({ title: 'خطا', message: 'لطفا عنوان و مسئول را مشخص کنید.' });
            return;
        }
        if (parentItem.use_workflow && !newSubtask.approver) {
            onRequestAlert({ title: 'خطا', message: 'لطفا تایید کننده را مشخص کنید.' });
            return;
        }
        onSave({ ...newSubtask, parentItem });
        setNewSubtask(initialSubtaskState);
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content details-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>ایجاد زیرفعالیت برای: {parentItem.title}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="add-user-form">
                        <div className="input-group">
                            <label>عنوان زیرفعالیت</label>
                            <input name="title" value={newSubtask.title} onChange={handleChange} />
                        </div>
                        <div className="input-group">
                            <label>مسئول</label>
                            <select name="responsible" value={newSubtask.responsible} onChange={handleChange}>
                                <option value="" disabled>انتخاب کنید...</option>
                                {responsibleUsers.map(member => (
                                    <option key={member.username} value={member.username}>{userMap.get(member.username) || member.username}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>تایید کننده</label>
                            <select 
                                name="approver" 
                                value={newSubtask.approver} 
                                onChange={handleChange}
                                disabled={!parentItem.use_workflow}
                            >
                                <option value="" disabled>انتخاب کنید...</option>
                                {approverUsers.map(member => (
                                    <option key={member.username} value={member.username}>{userMap.get(member.username) || member.username}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>تاریخ شروع</label>
                            <JalaliDatePicker name="startDate" id="subtask-startDate" value={newSubtask.startDate} onChange={handleChange} />
                        </div>
                        <div className="input-group">
                            <label>تاریخ پایان</label>
                            <JalaliDatePicker name="endDate" id="subtask-endDate" value={newSubtask.endDate} onChange={handleChange} />
                        </div>
                        <div className="input-group">
                            <label>اهمیت</label>
                            <select name="priority" value={newSubtask.priority} onChange={handleChange}>
                                <option value="کم">کم</option>
                                <option value="متوسط">متوسط</option>
                                <option value="زیاد">زیاد</option>
                            </select>
                        </div>
                        <button className="add-user-button" onClick={handleAddSubtask} style={{ alignSelf: 'flex-end' }}>افزودن</button>
                    </div>
                    
                    <h4 className="list-section-header">زیرفعالیت‌های موجود</h4>
                    <div className="table-wrapper">
                        <table className="user-list-table">
                            <thead>
                                <tr>
                                    <th>عنوان</th>
                                    <th>مسئول</th>
                                    <th>وضعیت</th>
                                    <th>اهمیت</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subtasks.length > 0 ? subtasks.map(st => (
                                    <tr key={st.id}>
                                        <td>{st.title}</td>
                                        <td>{userMap.get(st.responsible) || st.responsible}</td>
                                        <td>{renderStatusBadge(st.status)}</td>
                                        <td>{renderPriorityBadge(st.priority)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} style={{textAlign: 'center'}}>هنوز زیرفعالیتی تعریف نشده است.</td>
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