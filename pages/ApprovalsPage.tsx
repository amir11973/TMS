/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import { CollapsibleTableSection, renderStatusBadge } from '../components';
import { DetailsIcon, HistoryIcon, DocumentIcon, ApproveIcon, RejectIcon, NotesIcon } from '../icons';
import { User } from '../types';
import { toPersianDigits } from '../utils';

const isDelayed = (status: string, endDateStr: string) => {
    if (status === 'خاتمه یافته' || !endDateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    return endDate < today;
};

export const ApprovalsPage = ({ items, onApprovalDecision, onShowHistory, onShowGlobalHistory, onViewDetails, onShowInfo, users, onOpenNotesModal }: {
    items: any[];
    currentUser: any;
    onApprovalDecision: (item: any, decision: string) => void;
    onShowHistory: (item: any) => void;
    onShowGlobalHistory: () => void;
    onViewDetails: (item: any) => void;
    onShowInfo: (item: any) => void;
    users: User[];
    onOpenNotesModal: (item: any, viewMode: 'responsible' | 'approver', readOnly?: boolean) => void;
}) => {
    
    if (!Array.isArray(items)) {
        return <p>خطا: داده‌های تاییدات نامعتبر است.</p>;
    }

    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);
    
    const pendingApprovals = items.filter(item => item.status === 'ارسال برای تایید');

    const sortedPendingApprovals = useMemo(() => {
        return [...pendingApprovals].sort((a, b) => {
            const getApprovalRequestDate = (item: any) => {
                const entry = [...(item.history || [])].reverse().find(
                    (h: any) => h.status === 'ارسال برای تایید' && h.requestedStatus === item.requestedStatus
                );
                return entry ? new Date(entry.date).getTime() : 0;
            };
    
            return getApprovalRequestDate(b) - getApprovalRequestDate(a); // Descending
        });
    }, [pendingApprovals]);

    const groupedPendingApprovals = useMemo(() => {
        return sortedPendingApprovals.reduce((acc, task) => {
            const groupName = task.parentName || 'بدون پروژه/اقدام';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(task);
            return acc;
        }, {} as Record<string, any[]>);
    }, [sortedPendingApprovals]);


    return (
        <div className="approvals-page">
            <div className="page-header-actions">
                <button className="header-action-btn" onClick={onShowGlobalHistory}>
                    <HistoryIcon />
                    <span>تاریخچه تاییدات من</span>
                </button>
            </div>
            <section>
                <h3 className="list-section-header">موارد در انتظار تایید ({toPersianDigits(pendingApprovals.length)})</h3>
                <div className="table-wrapper">
                    <table className="user-list-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>عنوان</th>
                                <th>درخواست برای</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(groupedPendingApprovals).length > 0 ? (
                                 // FIX: Explicitly type 'tasks' to resolve 'unknown' type error.
                                 Object.entries(groupedPendingApprovals).map(([groupName, tasks]: [string, any[]]) => (
                                    // FIX: Wrapped CollapsibleTableSection in a React.Fragment and moved the key to it to satisfy TypeScript's prop checking, as 'key' is not a defined prop on the component.
                                    <React.Fragment key={groupName}>
                                        <CollapsibleTableSection title={groupName} count={tasks.length} defaultOpen={true}>
                                            {tasks.map((item, index) => {
                                                const approvalRequestInfo = [...(item.history || [])].reverse().find(
                                                    (h) => h.status === 'ارسال برای تایید' && h.requestedStatus === item.requestedStatus
                                                );

                                                return (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <div className="title-cell-content" style={{ justifyContent: 'center' }}>
                                                                <span>{toPersianDigits(index + 1)}</span>
                                                                <span 
                                                                    className={`delay-indicator-dot ${isDelayed(item.underlyingStatus, item.endDate) ? 'delayed' : 'on-time'}`}
                                                                    title={isDelayed(item.underlyingStatus, item.endDate) ? 'دارای تاخیر' : 'فاقد تاخیر'}
                                                                ></span>
                                                            </div>
                                                        </td>
                                                        <td>{item.title}</td>
                                                        <td>{renderStatusBadge(item.requestedStatus)}</td>
                                                        <td>
                                                            <div className="action-buttons-grid">
                                                                <div className="action-buttons-row">
                                                                    <button className="icon-btn details-btn" title="جزئیات" onClick={() => onViewDetails(item)}>
                                                                        <DetailsIcon />
                                                                    </button>
                                                                    <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(item)}>
                                                                        <HistoryIcon />
                                                                    </button>
                                                                    <button className="icon-btn" style={{color: '#a0a0a0'}} title="یادداشت‌ها" onClick={() => onOpenNotesModal(item, 'approver', true)}>
                                                                        <NotesIcon />
                                                                    </button>
                                                                    {(approvalRequestInfo?.comment || approvalRequestInfo?.fileUrl) && (
                                                                        <button className="icon-btn" style={{color: 'var(--c-info)'}} title="مشاهده اطلاعات ارسال" onClick={() => onShowInfo(item)}>
                                                                            <DocumentIcon />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="action-buttons-row">
                                                                    <button className="icon-btn approve-btn" title="تایید" onClick={() => onApprovalDecision(item, 'approved')}>
                                                                        <ApproveIcon />
                                                                    </button>
                                                                    <button className="icon-btn reject-btn" title="رد" onClick={() => onApprovalDecision(item, 'rejected')}>
                                                                        <RejectIcon />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </CollapsibleTableSection>
                                    </React.Fragment>
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
                </div>
            </section>
        </div>
    );
};