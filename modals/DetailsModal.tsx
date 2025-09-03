/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import moment from 'moment-jalaali';

export const DetailsModal = ({ isOpen, onClose, item }: { isOpen: boolean; onClose: () => void; item: any }) => {
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
                                    {item.activities.map((act: any) => {
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
