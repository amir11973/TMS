/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { User, TeamMember } from '../types';
import { CollapsibleTableSection } from '../components';
import { DetailsIcon, HistoryIcon, DelegateIcon, SendIcon } from '../icons';
import { toPersianDigits } from '../utils';
// FIX: Corrected import path to avoid conflict with empty modals.tsx file.
import { SendApprovalModal, DelegateTaskModal, MassDelegateModal, CompletedTasksModal } from '../modals/index';

export const TasksPage = ({ items, currentUser, onSendForApproval, onShowHistory, users, onDelegateTask, projects, actions, teamMembers, onMassDelegate, onViewDetails, onDirectStatusUpdate }: {
    items: any[];
    currentUser: User | null;
    onSendForApproval: (item: any, status: string, data: { comment: string, file: File | null }) => void;
    onShowHistory: (history: any[]) => void;
    users: User[];
    onDelegateTask: (item: any, newResponsible: string) => void;
    projects: any[];
    actions: any[];
    teamMembers: TeamMember[];
    onMassDelegate: (updates: any[]) => void;
    onViewDetails: (item: any) => void;
    onDirectStatusUpdate: (itemId: number, itemType: string, newStatus: string) => void;
}) => {
    const [sendApprovalModal, setSendApprovalModal] = useState({ isOpen: false, item: null as any, requestedStatus: '' });
    const [delegateModal, setDelegateModal] = useState({ isOpen: false, item: null as any });
    const [isMassDelegateModalOpen, setIsMassDelegateModalOpen] = useState(false);
    const [isCompletedTasksModalOpen, setIsCompletedTasksModalOpen] = useState(false);
    const [nextStatus, setNextStatus] = useState<Record<string, string>>({});
    
    if (!Array.isArray(items)) {
        return <p>خطا: داده‌های وظایف نامعتبر است.</p>;
    }
    
    const openTasks = items.filter(item => {
        const displayStatus = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
        return displayStatus === 'شروع نشده' || displayStatus === 'در حال اجرا';
    });
    const completedTasks = items.filter(item => item.status === 'خاتمه یافته' && (item.approvalStatus === 'approved' || item.use_workflow === false));

    const groupedOpenTasks = useMemo(() => {
        return openTasks.reduce((acc, task) => {
            const groupName = task.parentName || 'بدون پروژه/اقدام';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(task);
            return acc;
        }, {} as Record<string, any[]>);
    }, [openTasks]);

    const handleNextStatusChange = (itemId: number, newStatus: string) => {
        setNextStatus(prev => ({ ...prev, [itemId]: newStatus }));
    };

    const handleSendForApproval = (item: any, requestedStatus: string) => {
        setSendApprovalModal({ isOpen: true, item, requestedStatus });
    };

    const handleConfirmSend = (data: { comment: string, file: File | null }) => {
        onSendForApproval(sendApprovalModal.item, sendApprovalModal.requestedStatus, data);
        setSendApprovalModal({ isOpen: false, item: null, requestedStatus: '' });
    };

    const handleOpenDelegateModal = (item: any) => {
        setDelegateModal({ isOpen: true, item });
    };

    const handleConfirmDelegate = (newResponsibleUsername: string) => {
        onDelegateTask(delegateModal.item, newResponsibleUsername);
        setDelegateModal({ isOpen: false, item: null });
    };
    
    const handleSaveMassDelegation = (updates: any[]) => {
        onMassDelegate(updates);
        setIsMassDelegateModalOpen(false);
    };

    return (
        <div className="tasks-page">
            <div className="page-header-actions">
                <button className="header-action-btn" onClick={() => setIsMassDelegateModalOpen(true)}>
                    <DelegateIcon />
                    <span>تغییر واگذاری</span>
                </button>
                <button className="header-action-btn" onClick={() => setIsCompletedTasksModalOpen(true)}>
                    <HistoryIcon />
                    <span>خاتمه یافته ها</span>
                </button>
            </div>
            <section>
                <h3 className="list-section-header">وظایف جاری ({toPersianDigits(openTasks.length)})</h3>
                <div className="table-wrapper">
                    <table className="user-list-table">
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>عنوان</th>
                                <th>وضعیت تائید</th>
                                <th>وضعیت</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(groupedOpenTasks).length > 0 ? (
                                // FIX: Explicitly type 'tasks' to resolve 'unknown' type error.
                                Object.entries(groupedOpenTasks).map(([groupName, tasks]: [string, any[]]) => (
                                    <CollapsibleTableSection key={groupName} title={groupName} count={tasks.length} defaultOpen={true}>
                                        {tasks.map((item, index) => {
                                            let approvalStatusText = '—';
                                            if (item.status === 'ارسال برای تایید') {
                                                approvalStatusText = `منتظر تایید (${item.requestedStatus})`;
                                            } else if (item.approvalStatus === 'approved') {
                                                approvalStatusText = 'تایید شده';
                                            } else if (item.approvalStatus === 'rejected') {
                                                approvalStatusText = 'رد شده';
                                            }

                                            const displayStatus = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
                                            const canChangeStatus = item.status === 'شروع نشده' || item.status === 'در حال اجرا';

                                            return (
                                                <tr key={item.id}>
                                                    <td>{toPersianDigits(index + 1)}</td>
                                                    <td>{item.title}</td>
                                                    <td>{item.use_workflow === false ? 'گردش کار غیرفعال' : approvalStatusText}</td>
                                                    <td>{displayStatus}</td>
                                                    <td>
                                                        <div className="action-buttons-grid">
                                                            <div className="action-buttons-row">
                                                                <button className="icon-btn details-btn" title="جزئیات" onClick={() => onViewDetails(item)}>
                                                                    <DetailsIcon />
                                                                </button>
                                                                <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(item.history)}>
                                                                    <HistoryIcon />
                                                                </button>
                                                                <button className="icon-btn delegate-btn" title="واگذاری" onClick={() => handleOpenDelegateModal(item)}>
                                                                    <DelegateIcon />
                                                                </button>
                                                            </div>
                                                            {canChangeStatus && (
                                                                <div className="action-buttons-row">
                                                                    {item.use_workflow === false ? (
                                                                        <select
                                                                            className="status-select"
                                                                            value={displayStatus}
                                                                            onChange={(e) => onDirectStatusUpdate(item.id, item.type, e.target.value)}
                                                                        >
                                                                            {item.status === 'شروع نشده' && <option value="شروع نشده">شروع نشده</option>}
                                                                            <option value="در حال اجرا">در حال اجرا</option>
                                                                            <option value="خاتمه یافته">خاتمه یافته</option>
                                                                        </select>
                                                                    ) : (
                                                                        <>
                                                                            <select
                                                                                className="status-select"
                                                                                value={nextStatus[item.id] || (item.status === 'شروع نشده' ? 'در حال اجرا' : 'خاتمه یافته')}
                                                                                onChange={(e) => handleNextStatusChange(item.id, e.target.value)}
                                                                            >
                                                                                <option value="در حال اجرا">در حال اجرا</option>
                                                                                <option value="خاتمه یافته">خاتمه یافته</option>
                                                                            </select>
                                                                            <button 
                                                                                className="icon-btn" 
                                                                                style={{color: 'var(--c-info)'}} 
                                                                                title="ارسال برای تایید"
                                                                                onClick={() => handleSendForApproval(item, nextStatus[item.id] || (item.status === 'شروع نشده' ? 'در حال اجرا' : 'خاتمه یافته'))}
                                                                            >
                                                                                <SendIcon />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </CollapsibleTableSection>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                                        هیچ وظیفه جاری برای شما ثبت نشده است.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
            <SendApprovalModal 
                isOpen={sendApprovalModal.isOpen}
                onClose={() => setSendApprovalModal({ isOpen: false, item: null, requestedStatus: '' })}
                onSend={handleConfirmSend}
                requestedStatus={sendApprovalModal.requestedStatus}
            />
            <DelegateTaskModal
                isOpen={delegateModal.isOpen}
                onClose={() => setDelegateModal({ isOpen: false, item: null })}
                onDelegate={handleConfirmDelegate}
                item={delegateModal.item}
                users={users}
            />
            <MassDelegateModal
                isOpen={isMassDelegateModalOpen}
                onClose={() => setIsMassDelegateModalOpen(false)}
                onSave={handleSaveMassDelegation}
                projects={projects}
                actions={actions}
                teamMembers={teamMembers}
                currentUser={currentUser}
                users={users}
            />
            <CompletedTasksModal
                isOpen={isCompletedTasksModalOpen}
                onClose={() => setIsCompletedTasksModalOpen(false)}
                items={completedTasks}
                onShowHistory={onShowHistory}
            />
        </div>
    );
};
