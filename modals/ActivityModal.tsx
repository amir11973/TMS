/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment-jalaali';
import { User } from '../types';
import { getTodayString } from '../constants';
import { JalaliDatePicker } from '../components';

export const ActivityModal = ({ isOpen, onClose, onSave, activityToEdit, users, onRequestAlert, isProjectOwner, responsibleUsers, approverUsers, currentUser }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (activity: any) => void;
    activityToEdit: any;
    users: User[];
    onRequestAlert: (props: any) => void;
    isProjectOwner: boolean;
    responsibleUsers: User[];
    approverUsers: User[];
    currentUser: User | null;
}) => {
    // FIX: Add 'underlyingStatus', 'requestedStatus', and 'approvalStatus' to prevent type errors.
    const initialActivityState = { title: '', startDate: getTodayString(), endDate: getTodayString(), responsible: '', approver: '', priority: 'متوسط', status: 'شروع نشده', underlyingStatus: null, requestedStatus: null, approvalStatus: null };
    
    const [activity, setActivity] = useState(initialActivityState);
    
    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    useEffect(() => {
        if (isOpen) {
            if (activityToEdit) {
                setActivity({ ...initialActivityState, ...activityToEdit });
            } else {
                setActivity({
                    ...initialActivityState,
                    responsible: currentUser?.username || '',
                    approver: currentUser?.username || '',
                });
            }
        }
    }, [activityToEdit, isOpen, currentUser]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'endDate' && moment(value).isBefore(activity.startDate)) {
            onRequestAlert({
                title: 'تاریخ نامعتبر',
                message: 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.'
            });
            return;
        }

        const updatedActivity = { ...activity, [name]: value };

        // Date validation logic
        if (name === 'startDate' && moment(updatedActivity.endDate).isBefore(value)) {
            updatedActivity.endDate = value;
        }
        
        if (name === 'status' && currentUser?.username === 'mahmoudi.pars@gmail.com') {
            updatedActivity.underlyingStatus = null;
            updatedActivity.requestedStatus = null;
            updatedActivity.approvalStatus = null;
        }


        setActivity(updatedActivity);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(activity);
    };

    const modalTitle = activityToEdit ? "ویرایش فعالیت" : "تعریف فعالیت جدید";
    const displayStatus = (activity.status === 'ارسال برای تایید' && activity.underlyingStatus) 
        ? activity.underlyingStatus 
        : (activity.status || 'شروع نشده');
    const isAdmin = currentUser?.username === 'mahmoudi.pars@gmail.com';

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
                                <label htmlFor="title">عنوان فعالیت</label>
                                <input name="title" id="title" value={activity.title} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label htmlFor="activity-priority">درجه اهمیت</label>
                                <select name="priority" id="activity-priority" value={activity.priority || 'متوسط'} onChange={handleChange} required>
                                    <option value="کم">کم</option>
                                    <option value="متوسط">متوسط</option>
                                    <option value="زیاد">زیاد</option>
                                </select>
                            </div>
                        </div>
                        <div className="input-grid-col-2">
                             <div className="input-group">
                                <label htmlFor="startDate">شروع فعالیت</label>
                                <JalaliDatePicker name="startDate" id="startDate" value={activity.startDate} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label htmlFor="endDate">پایان فعالیت</label>
                                <JalaliDatePicker name="endDate" id="endDate" value={activity.endDate} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="input-grid-col-2">
                            <div className="input-group">
                                <label htmlFor="responsible">مسئول انجام</label>
                                <select name="responsible" id="responsible" value={activity.responsible} onChange={handleChange} required disabled={!isProjectOwner && !!activityToEdit}>
                                    <option value="" disabled>یک کاربر انتخاب کنید</option>
                                    {responsibleUsers.map(user => <option key={user.username} value={user.username}>{userMap.get(user.username) || user.username}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label htmlFor="approver">تایید کننده</label>
                                <select name="approver" id="approver" value={activity.approver} onChange={handleChange} required disabled={!isProjectOwner && !!activityToEdit}>
                                    <option value="" disabled>یک کاربر انتخاب کنید</option>
                                    {approverUsers.map(user => <option key={user.username} value={user.username}>{userMap.get(user.username) || user.username}</option>)}
                                </select>
                            </div>
                        </div>
                         <div className="input-group">
                            <label htmlFor="activity-status">وضعیت</label>
                            <select name="status" id="activity-status" value={displayStatus} onChange={handleChange} disabled={!isAdmin}>
                                <option value="شروع نشده">شروع نشده</option>
                                <option value="در حال اجرا">در حال اجرا</option>
                                <option value="خاتمه یافته">خاتمه یافته</option>
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