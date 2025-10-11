/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { User, TeamMember } from '../types';
import { CollapsibleTableSection, JalaliCalendarView, KanbanBoard, renderStatusBadge } from '../components';
import { DetailsIcon, HistoryIcon, SendIcon, SendForFinishIcon, NotesIcon, CalendarIcon, ListIcon, KanbanIcon, DelegateIcon } from '../icons';
import { toPersianDigits } from '../utils';
import { CompletedTasksModal } from '../modals/index';

const isDelayed = (status: string, endDateStr: string) => {
    if (status === 'خاتمه یافته' || !endDateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    return endDate < today;
};

export const TasksPage = ({ items, currentUser, onShowHistory, users, teamMembers, onViewDetails, onDirectStatusUpdate, onSendForApproval, onOpenNotesModal, onUpdateItemsOrder, onRequestAlert, onOpenSubtaskModal, onOpenDelegatedItemsModal, allActivities, allActions, projects, onShowHierarchy }: {
    items: any[];
    currentUser: User | null;
    onShowHistory: (item: any) => void;
    users: User[];
    teamMembers: TeamMember[];
    onViewDetails: (item: any) => void;
    onDirectStatusUpdate: (itemId: number, itemType: string, newStatus: string) => void;
    onSendForApproval: (item: any, requestedStatus: string) => void;
    onOpenNotesModal: (item: any, viewMode: 'responsible' | 'approver') => void;
    onUpdateItemsOrder: (updates: any[]) => void;
    onRequestAlert: (props: any) => void;
    onOpenSubtaskModal: (item: any) => void;
    onOpenDelegatedItemsModal: () => void;
    allActivities: any[];
    allActions: any[];
    projects: any[];
    onShowHierarchy: (item: any) => void;
}) => {
    const [isCompletedTasksModalOpen, setIsCompletedTasksModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar', or 'kanban'
    
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
            const groupName = task.parentName || 'بدون والد';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(task);
            return acc;
        }, {} as Record<string, any[]>);
    }, [openTasks]);

    const handleKanbanStatusChange = (item: any, newStatus: string) => {
        if (item.use_workflow === false) {
            onDirectStatusUpdate(item.id, item.type, newStatus);
        } else {
            onSendForApproval(item, newStatus);
        }
    };

    const renderContent = () => {
        switch (viewMode) {
            case 'calendar':
                return (
                    <section style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                        <h3 className="list-section-header">نمای تقویم وظایف</h3>
                        <JalaliCalendarView items={openTasks} onViewDetails={onViewDetails} />
                    </section>
                );
            case 'kanban':
                return (
                    <section style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                        <h3 className="list-section-header">نمای کانبان وظایف</h3>
                        <KanbanBoard 
                            items={items} 
                            onCardClick={onViewDetails}
                            onStatusChange={handleKanbanStatusChange}
                            onUpdateItemsOrder={onUpdateItemsOrder}
                            onRequestAlert={onRequestAlert}
                        />
                    </section>
                );
            case 'list':
            default:
                return (
                    <section>
                        <h3 className="list-section-header">وظایف جاری ({toPersianDigits(openTasks.length)})</h3>
                        <div className="table-wrapper">
                            <table className="user-list-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>عنوان</th>
                                        <th>وضعیت تائید</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(groupedOpenTasks).length > 0 ? (
                                        Object.entries(groupedOpenTasks).map(([groupName, tasks]: [string, any[]]) => (
                                            <React.Fragment key={groupName}>
                                                <CollapsibleTableSection title={groupName} count={tasks.length} defaultOpen={true}>
                                                    {tasks.map((item, index) => {
                                                        let approvalStatusText = '—';
                                                        if (item.use_workflow === false) {
                                                            approvalStatusText = 'گردش کار غیرفعال';
                                                        } else if (item.status === 'ارسال برای تایید') {
                                                            approvalStatusText = `منتظر تایید (${item.requestedStatus})`;
                                                        } else if (item.approvalStatus === 'approved') {
                                                            approvalStatusText = 'تایید شده';
                                                        } else if (item.approvalStatus === 'rejected') {
                                                            approvalStatusText = 'رد شده';
                                                        }

                                                        const displayStatus = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
                                                        const isPendingApproval = item.status === 'ارسال برای تایید';
                                                        const canStart = displayStatus === 'شروع نشده' && !isPendingApproval;
                                                        const canFinish = displayStatus === 'در حال اجرا' && !isPendingApproval;
                                                        const isDelegated = item.isDelegated;

                                                        return (
                                                            <tr key={item.id} className={isDelegated ? 'delegated-task' : ''}>
                                                                <td>
                                                                    <div className="title-cell-content" style={{ justifyContent: 'center' }}>
                                                                        <span>{toPersianDigits(index + 1)}</span>
                                                                        <span 
                                                                            className={`delay-indicator-dot ${isDelayed(displayStatus, item.endDate) ? 'delayed' : 'on-time'}`}
                                                                            title={isDelayed(displayStatus, item.endDate) ? 'دارای تاخیر' : 'فاقد تاخیر'}
                                                                        ></span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="title-cell-content" style={{ justifyContent: 'flex-start' }}>
                                                                        <span>{item.title}</span>
                                                                        {item.isDelegated && <span className="item-tag parent-tag" onClick={(e) => { e.stopPropagation(); onShowHierarchy(item); }}>والد</span>}
                                                                        {item.isSubtask && <span className="item-tag subtask-tag" onClick={(e) => { e.stopPropagation(); onShowHierarchy(item); }}>زیرفعالیت</span>}
                                                                    </div>
                                                                </td>
                                                                <td>{renderStatusBadge(displayStatus, approvalStatusText)}</td>
                                                                <td>
                                                                    <div className="action-buttons-grid">
                                                                        <div className="action-buttons-row">
                                                                            <button className="icon-btn details-btn" title="جزئیات" onClick={() => onViewDetails(item)}>
                                                                                <DetailsIcon />
                                                                            </button>
                                                                            <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(item)}>
                                                                                <HistoryIcon />
                                                                            </button>
                                                                            <button className="icon-btn delegate-btn" title="ایجاد زیرفعالیت" onClick={() => onOpenSubtaskModal(item)}>
                                                                                <DelegateIcon />
                                                                            </button>
                                                                            <button className="icon-btn" style={{color: '#a0a0a0'}} title="یادداشت‌ها" onClick={() => onOpenNotesModal(item, 'responsible')}>
                                                                                <NotesIcon />
                                                                            </button>
                                                                        </div>
                                                                        {item.use_workflow === false ? (
                                                                            <div className="action-buttons-row">
                                                                                <select
                                                                                    className="status-select"
                                                                                    value={displayStatus}
                                                                                    onChange={(e) => onDirectStatusUpdate(item.id, item.type, e.target.value)}
                                                                                    disabled={isPendingApproval || isDelegated}
                                                                                    title={isDelegated ? "وضعیت این آیتم توسط زیرفعالیت‌های آن کنترل می‌شود" : ""}
                                                                                >
                                                                                    <option value="شروع نشده">شروع نشده</option>
                                                                                    <option value="در حال اجرا">در حال اجرا</option>
                                                                                    <option value="خاتمه یافته">خاتمه یافته</option>
                                                                                </select>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="action-buttons-row">
                                                                                {canStart && (
                                                                                    <>
                                                                                        <button className="icon-btn" style={{ color: 'var(--c-info)' }} title={isDelegated ? "ابتدا باید زیرفعالیت‌ها انجام شوند" : "ارسال برای تایید شروع"} onClick={() => onSendForApproval(item, 'در حال اجرا')} disabled={isDelegated}>
                                                                                            <SendIcon />
                                                                                        </button>
                                                                                        <button className="icon-btn" title={isDelegated ? "ابتدا باید زیرفعالیت‌ها انجام شوند" : "ارسال برای تایید خاتمه"} onClick={() => onSendForApproval(item, 'خاتمه یافته')} disabled={isDelegated}>
                                                                                            <SendForFinishIcon />
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                                {canFinish && (
                                                                                    <button className="icon-btn" title={isDelegated ? "ابتدا باید زیرفعالیت‌ها انجام شوند" : "ارسال برای تایید خاتمه"} onClick={() => onSendForApproval(item, 'خاتمه یافته')} disabled={isDelegated}>
                                                                                        <SendForFinishIcon />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </CollapsibleTableSection>
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                                                هیچ وظیفه جاری برای شما ثبت نشده است.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
        }
    };


    return (
        <div className="tasks-page">
            <div className="page-header-actions">
                 <button className="header-action-btn" onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}>
                    {viewMode === 'kanban' ? <ListIcon /> : <KanbanIcon />}
                    <span>{viewMode === 'kanban' ? 'نمای لیست' : 'نمای کانبان'}</span>
                </button>
                 <button className="header-action-btn" onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}>
                    {viewMode !== 'calendar' ? <CalendarIcon /> : <ListIcon />}
                    <span>{viewMode !== 'calendar' ? 'نمای تقویم' : 'نمای لیست'}</span>
                </button>
                <button className="header-action-btn" onClick={onOpenDelegatedItemsModal}>
                    <DelegateIcon />
                    <span>موارد واگذار شده</span>
                </button>
                <button className="header-action-btn" onClick={() => setIsCompletedTasksModalOpen(true)}>
                    <HistoryIcon />
                    <span>خاتمه یافته ها</span>
                </button>
            </div>
            {renderContent()}
            <CompletedTasksModal
                isOpen={isCompletedTasksModalOpen}
                onClose={() => setIsCompletedTasksModalOpen(false)}
                items={completedTasks}
                onShowHistory={onShowHistory}
                onViewDetails={onViewDetails}
            />
        </div>
    );
};