/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment-jalaali';
import { User, CustomField } from '../types';
import { getTodayString } from '../constants';
import { JalaliDatePicker, renderStatusBadge } from '../components';

export const ActivityModal = ({ isOpen, onClose, onSave, activityToEdit, users, onRequestAlert, isProjectOwner, responsibleUsers, approverUsers, currentUser, projectUseWorkflow, customFields }: {
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
    projectUseWorkflow: boolean;
    customFields: CustomField[];
}) => {
    // FIX: Add 'underlyingStatus', 'requestedStatus', and 'approvalStatus' to prevent type errors.
    const initialActivityState = { title: '', startDate: getTodayString(), endDate: getTodayString(), responsible: '', approver: '', priority: 'متوسط', status: 'شروع نشده', underlyingStatus: null, requestedStatus: null, approvalStatus: null };
    
    const [activity, setActivity] = useState(initialActivityState);
    const [customValues, setCustomValues] = useState<Record<string, any>>({});
    
    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    const isNew = !activityToEdit;

    const relevantCustomFields = useMemo(() => {
        if (!currentUser) return [];
        const activityCustomFields = customFields.filter(f => f.field_group === 'activity');

        if (isNew) {
            return activityCustomFields
                .filter(f => f.owner_username === currentUser.username)
                .map(f => ({ ...f, isReadOnly: false }));
        } else {
            const currentCustomValues = activityToEdit?.custom_field_values || {};
            
            return activityCustomFields
                .map(field => {
                    const isOwner = field.owner_username === currentUser.username;
                    const hasValue = currentCustomValues.hasOwnProperty(field.id);
                    const isPublic = !field.is_private;

                    if (isOwner) {
                        return { ...field, isReadOnly: false };
                    }
                    if (isPublic && hasValue) {
                        return { ...field, isReadOnly: true };
                    }
                    return null;
                })
                .filter((field): field is CustomField & { isReadOnly: boolean } => field !== null);
        }
    }, [customFields, currentUser, activityToEdit, isNew]);

    useEffect(() => {
        if (isOpen) {
            if (activityToEdit) {
                setActivity({ ...initialActivityState, ...activityToEdit });
                setCustomValues(activityToEdit.custom_field_values || {});
            } else {
                setActivity({
                    ...initialActivityState,
                    responsible: currentUser?.username || '',
                    approver: currentUser?.username || '',
                });
                setCustomValues({});
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

    const handleCustomValueChange = (fieldId: number, value: string) => {
        setCustomValues(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...activity, custom_field_values: customValues });
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
                                <select name="approver" id="approver" value={activity.approver} onChange={handleChange} required disabled={(!isProjectOwner && !!activityToEdit) || !projectUseWorkflow}>
                                    <option value="" disabled>یک کاربر انتخاب کنید</option>
                                    {approverUsers.map(user => <option key={user.username} value={user.username}>{userMap.get(user.username) || user.username}</option>)}
                                </select>
                            </div>
                        </div>
                         <div className="input-group">
                            <label htmlFor="activity-status">وضعیت</label>
                            {isAdmin ? (
                                <select name="status" id="activity-status" value={displayStatus} onChange={handleChange}>
                                    <option value="شروع نشده">شروع نشده</option>
                                    <option value="در حال اجرا">در حال اجرا</option>
                                    <option value="خاتمه یافته">خاتمه یافته</option>
                                </select>
                            ) : (
                                renderStatusBadge(displayStatus)
                            )}
                        </div>
                        {relevantCustomFields.length > 0 && <h4 className="list-section-header" style={{marginTop: '1.5rem', marginBottom: '1rem'}}>فیلدهای سفارشی</h4>}
                        {relevantCustomFields.map(field => (
                            <div className="input-group" key={field.id}>
                                <label htmlFor={`custom-field-act-${field.id}`}>{field.title}</label>
                                <input
                                    id={`custom-field-act-${field.id}`}
                                    value={customValues[field.id] || ''}
                                    onChange={e => !field.isReadOnly && handleCustomValueChange(field.id, e.target.value)}
                                    readOnly={field.isReadOnly}
                                />
                            </div>
                        ))}
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