/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import moment from 'moment-jalaali';
import { User, CustomField } from '../types';
import { renderPriorityBadge } from '../components';
import { DetailsIcon } from '../icons';

export const DetailsModal = ({ isOpen, onClose, item, users, onViewDetails, customFields, currentUser, allActivities, allActions }: { 
    isOpen: boolean; 
    onClose: () => void; 
    item: any; 
    users: User[];
    onViewDetails: (item: any) => void;
    customFields: CustomField[];
    currentUser: User | null;
    allActivities: any[];
    allActions: any[];
}) => {
    if (!isOpen) return null;

    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);
    const customFieldMap = useMemo(() => new Map(customFields.map(f => [f.id.toString(), f])), [customFields]);

    const subtasks = useMemo(() => {
        if (!item || item.type === 'project') return [];
        const subtaskSource = item.type === 'activity' ? allActivities : allActions;
        return subtaskSource.filter((sub: any) => sub.parent_id === item.id);
    }, [item, allActivities, allActions]);


    const isProject = item.type === 'project';
    const isActivity = item.type === 'activity';
    const displayStatus = (item.status === 'ارسال برای تایید' && item.underlyingStatus) ? item.underlyingStatus : item.status;
    const priority = item?.priority || 'متوسط';
    const priorityClass = {
        'کم': 'low',
        'متوسط': 'medium',
        'زیاد': 'high'
    }[priority];
    
    const renderActivityDetails = () => (
         <div className="detail-grid">
            <div className="detail-group">
                <span className="detail-label">عنوان فعالیت</span>
                <span className="detail-value">{item.title}</span>
            </div>
            <div className="detail-group">
                <span className="detail-label">درجه اهمیت</span>
                <span className="detail-value">
                    <span className={`priority-badge priority-${priorityClass}`}>{priority}</span>
                </span>
            </div>
             <div className="detail-group">
                <span className="detail-label">پروژه والد</span>
                <span className="detail-value">{item.parentName}</span>
            </div>
            <div className="detail-group">
                <span className="detail-label">وضعیت</span>
                <span className="detail-value">{displayStatus}</span>
            </div>
            <div className="detail-group">
                <span className="detail-label">مسئول</span>
                <span className="detail-value">{userMap.get(item.responsible) || item.responsible}</span>
            </div>
            <div className="detail-group">
                <span className="detail-label">تایید کننده</span>
                <span className="detail-value">{userMap.get(item.approver) || item.approver}</span>
            </div>
             <div className="detail-group">
                <span className="detail-label">تاریخ شروع</span>
                <span className="detail-value">{moment(item.startDate).format('jYYYY/jMM/jDD')}</span>
            </div>
            <div className="detail-group">
                <span className="detail-label">تاریخ پایان</span>
                <span className="detail-value">{moment(item.endDate).format('jYYYY/jMM/jDD')}</span>
            </div>
        </div>
    );

    const handleViewActivityDetails = (activity: any) => {
        onViewDetails({
            ...activity,
            type: 'activity',
            parentName: item.title
        });
    };

    const renderCustomFields = () => {
        if (!item.custom_field_values || Object.keys(item.custom_field_values).length === 0) {
            return null;
        }

        const visibleFields = Object.entries(item.custom_field_values)
            .map(([fieldId, value]) => {
                const fieldDef = customFieldMap.get(fieldId);
                if (!fieldDef) return null;

                const canView = !fieldDef.is_private || (currentUser && fieldDef.owner_username === currentUser.username);
                if (!canView) return null;

                return { ...fieldDef, value };
            })
            .filter(Boolean);

        if (visibleFields.length === 0) return null;

        return (
            <>
                <h4 className="list-section-header">فیلدهای سفارشی</h4>
                <div className="detail-grid">
                    {visibleFields.map((field: any) => (
                         <div className="detail-group" key={field.id}>
                            <span className="detail-label">{field.title}</span>
                            <p className="detail-value">{field.value || '—'}</p>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content details-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>جزئیات {isProject ? 'پروژه' : isActivity ? 'فعالیت' : 'اقدام'}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {isActivity ? renderActivityDetails() : (
                        <>
                            <div className="detail-grid">
                                <div className="detail-group">
                                    <span className="detail-label">عنوان</span>
                                    <span className="detail-value">{item.title}</span>
                                </div>
                                 <div className="detail-group">
                                    <span className="detail-label">{isProject ? 'مالک' : 'تایید کننده'}</span>
                                    <span className="detail-value">{isProject ? (userMap.get(item.owner) || item.owner) : (userMap.get(item.approver) || item.approver)}</span>
                                </div>
                                <div className="detail-group">
                                    <span className="detail-label">{isProject ? 'مدیر پروژه' : 'مسئول'}</span>
                                    <span className="detail-value">{isProject ? (userMap.get(item.projectManager) || item.projectManager) : (userMap.get(item.responsible) || item.responsible)}</span>
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
                                    <span className="detail-label">بخش</span>
                                    <span className="detail-value">{item.unit}</span>
                                </div>
                                <div className="detail-group">
                                    <span className="detail-label">تاریخ شروع</span>
                                    <span className="detail-value">{moment(isProject ? item.projectStartDate : item.startDate).format('jYYYY/jMM/jDD')}</span>
                                </div>
                                <div className="detail-group">
                                    <span className="detail-label">تاریخ پایان</span>
                                    <span className="detail-value">{moment(isProject ? item.projectEndDate : item.endDate).format('jYYYY/jMM/jDD')}</span>
                                </div>
                                {isProject && (
                                     <div className="detail-group full-width">
                                        <span className="detail-label">هدف پروژه</span>
                                        <p className="detail-value">{item.projectGoal || 'ثبت نشده'}</p>
                                    </div>
                                )}
                            </div>
                            
                            {isProject && renderCustomFields()}

                            {isProject && item.activities && item.activities.length > 0 && (
                                <>
                                    <h4 className="list-section-header">فعالیت‌های پروژه</h4>
                                    <div className="table-wrapper">
                                        <table className="user-list-table">
                                            <thead>
                                                <tr>
                                                    <th>عنوان</th>
                                                    <th>وضعیت</th>
                                                    <th>اهمیت</th>
                                                    <th>عملیات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.activities.map((act: any) => {
                                                    const isPendingApproval = act.status === 'ارسال برای تایید';
                                                    const effectiveStatus = isPendingApproval ? act.underlyingStatus : act.status;
                                                    
                                                    return (
                                                        <tr key={act.id}>
                                                            <td>{act.title}</td>
                                                            <td>{effectiveStatus}</td>
                                                            <td>{renderPriorityBadge(act.priority)}</td>
                                                            <td>
                                                                <button 
                                                                    className="icon-btn details-btn" 
                                                                    title="مشاهده جزئیات فعالیت"
                                                                    onClick={() => handleViewActivityDetails(act)}
                                                                >
                                                                    <DetailsIcon />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                    {!isProject && renderCustomFields()}

                    {subtasks.length > 0 && (
                        <>
                            <h4 className="list-section-header">زیرفعالیت‌ها</h4>
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
                                        {subtasks.map((sub: any) => (
                                            <tr key={sub.id}>
                                                <td>{sub.title}</td>
                                                <td>{userMap.get(sub.responsible) || sub.responsible}</td>
                                                <td>{sub.status}</td>
                                                <td>{renderPriorityBadge(sub.priority)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>بستن</button>
                </div>
            </div>
        </div>
    );
};