/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { User, TeamMember } from '../types';
import { CollapsibleTableSection } from '../components';
import { DetailsIcon, HistoryIcon, DelegateIcon } from '../icons';
// FIX: Corrected import path to avoid conflict with empty modals.tsx file.
import { SendApprovalModal, DelegateTaskModal, MassDelegateModal, CompletedTasksModal } from '../modals/index';

export const TasksPage = ({ items, currentUser, onSendForApproval, onShowHistory, users, onDelegateTask, projects, actions, teamMembers, onMassDelegate, onViewDetails }: {
    items: any[];
    currentUser: User | null;
    onSendForApproval: (item: any, status: string, data: any) => void;
    onShowHistory: (history: any[]) => void;
    users: User[];
    onDelegateTask: (item: any, newResponsible: string) => void;
    projects: any[];
    actions: any[];
    teamMembers: TeamMember[];
    onMassDelegate: (updates: any[]) => void;
    onViewDetails: (item: any) => void;
}) => {
    const [sendApprovalModal, setSendApprovalModal] = useState({ isOpen: false, item: null as any, requestedStatus: '' });
    const [delegateModal, setDelegateModal] = useState({ isOpen: false, item: null as any });
    const [isMassDelegateModalOpen, setIsMassDelegateModalOpen] = useState(false);
    const [isCompletedTasksModalOpen, setIsCompletedTasksModalOpen] = useState(false);
    
    if (!Array.isArray(items)) {
        return <p>خطا: داده‌های وظایف نامعتبر است.</p>;
    }
    
    const openTasks = items.filter(item => !(item.status === 'خاتمه یافته' && item.approvalStatus === 'approved'));
    const completedTasks = items.filter(item => item.status === 'خاتمه یافته' && item.approvalStatus === 'approved');

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

    const handleSendForApproval = (item: any, requestedStatus: string) => {
        setSendApprovalModal({ isOpen: true, item, requestedStatus });
    };

    const handleConfirmSend = (extraData: any) => {
        onSendForApproval(sendApprovalModal.item, sendApprovalModal.requestedStatus, extraData);
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
                    <span>فعالیتهای خاتمه یافته</span>
                </button>
            </div>
            <section>
                <h3 className="list-section-header">وظایف جاری ({openTasks.length})</h3>
                <div className="table-wrapper">
                    <table className="user-list-table">
                        <thead>
                            <tr>
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
                                        {tasks.map(item => {
                                            let approvalStatusText = '—';
                                            if (item.status === 'ارسال برای تایید') {
                                                approvalStatusText = `منتظر تایید (${item.requestedStatus})`;
                                            } else if (item.approvalStatus === 'approved') {
                                                approvalStatusText = 'تایید شده';
                                            } else if (item.approvalStatus === 'rejected') {
                                                approvalStatusText = 'رد شده';
                                            }

                                            const displayStatus = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;

                                            return (
                                                <tr key={item.id}>
                                                    <td>{item.title}</td>
                                                    <td>{approvalStatusText}</td>
                                                    <td>{displayStatus}</td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button className="icon-btn details-btn" title="جزئیات" onClick={() => onViewDetails(item)}>
                                                                <DetailsIcon />
                                                            </button>
                                                            <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(item.history)}>
                                                                <HistoryIcon />
                                                            </button>
                                                            <button className="icon-btn delegate-btn" title="واگذاری" onClick={() => handleOpenDelegateModal(item)}>
                                                                <DelegateIcon />
                                                            </button>
                                                            {item.status === 'شروع نشده' && (
                                                                <button className="send-approval-btn" onClick={() => handleSendForApproval(item, 'در حال اجرا')}>ارسال برای تایید شروع</button>
                                                            )}
                                                            {item.status === 'در حال اجرا' && (
                                                                <button className="send-approval-btn" onClick={() => handleSendForApproval(item, 'خاتمه یافته')}>ارسال برای تایید خاتمه</button>
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
            />
            <CompletedTasksModal
                isOpen={isCompletedTasksModalOpen}
                onClose={() => setIsCompletedTasksModalOpen(false)}
                items={completedTasks}
            />
        </div>
    );
};