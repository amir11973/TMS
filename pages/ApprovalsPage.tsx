/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import { CollapsibleTableSection } from '../components';
import { DetailsIcon, HistoryIcon, DocumentIcon, ApproveIcon, RejectIcon } from '../icons';
import { User } from '../types';

export const ApprovalsPage = ({ items, onApprovalDecision, onShowHistory, onShowGlobalHistory, onViewDetails, onShowInfo, users }: {
    items: any[];
    currentUser: any;
    onApprovalDecision: (item: any, decision: string) => void;
    onShowHistory: (history: any[]) => void;
    onShowGlobalHistory: () => void;
    onViewDetails: (item: any) => void;
    onShowInfo: (item: any) => void;
    users: User[];
}) => {
    
    if (!Array.isArray(items)) {
        return <p>خطا: داده‌های تاییدات نامعتبر است.</p>;
    }

    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);
    
    const pendingApprovals = items.filter(item => item.status === 'ارسال برای تایید');

    const groupedPendingApprovals = useMemo(() => {
        return pendingApprovals.reduce((acc, task) => {
            const groupName = task.parentName || 'بدون پروژه/اقدام';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(task);
            return acc;
        }, {} as Record<string, any[]>);
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
                <div className="table-wrapper">
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
                                 // FIX: Explicitly type 'tasks' to resolve 'unknown' type error.
                                 Object.entries(groupedPendingApprovals).map(([groupName, tasks]: [string, any[]]) => (
                                    <CollapsibleTableSection key={groupName} title={groupName} count={tasks.length} defaultOpen={true}>
                                        {tasks.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.title}</td>
                                                <td>{userMap.get(item.responsible) || item.responsible}</td>
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
                                                        <button className="icon-btn approve-btn" title="تایید" onClick={() => onApprovalDecision(item, 'approved')}>
                                                            <ApproveIcon />
                                                        </button>
                                                        <button className="icon-btn reject-btn" title="رد" onClick={() => onApprovalDecision(item, 'rejected')}>
                                                            <RejectIcon />
                                                        </button>
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
                </div>
            </section>
        </div>
    );
};