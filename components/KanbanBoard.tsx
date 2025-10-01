/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo, useState } from 'react';
import { toPersianDigits } from '../utils';
import { renderPriorityBadge } from './PriorityBadge';
import { VisibilityIcon, VisibilityOffIcon } from '../icons';

const isDelayed = (item: any) => {
    const status = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
    if (status === 'خاتمه یافته' || !item.endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(item.endDate);
    return endDate < today;
};

const KanbanCard = ({ item, onCardClick }: { item: any, onCardClick: (item: any) => void }) => {
    const delayed = isDelayed(item);
    const isPending = item.approvalStatus === 'pending';

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('dragging');
    };

    return (
        <div 
            className={`kanban-card ${delayed ? 'delayed' : ''} ${isPending ? 'pending-approval' : ''}`} 
            onClick={() => onCardClick(item)} 
            role="button" 
            tabIndex={0}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            data-id={`${item.type}-${item.id}`}
            title={item.title}
        >
            <div className="kanban-card-title">{item.title}</div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '26px'}}>
                 {item.type === 'activity' && <div className="kanban-card-parent">{item.parentName}</div>}
                 {isPending && <div className="kanban-card-tag">منتظر تایید</div>}
            </div>
            <div className="kanban-card-footer">
                {renderPriorityBadge(item.priority)}
            </div>
        </div>
    );
};

export const KanbanBoard = ({ items, onCardClick, onStatusChange, onUpdateItemsOrder }: { 
    items: any[], 
    onCardClick: (item: any) => void,
    onStatusChange: (item: any, newStatus: string) => void,
    onUpdateItemsOrder: (updates: { id: number; type: string; kanban_order: number }[]) => void 
}) => {
    const [showAllCompleted, setShowAllCompleted] = useState(false);
    
    const columns = useMemo(() => {
        const createColumn = (status: string) => items
            .filter(item => {
                let targetColumn = item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
                if (item.approvalStatus === 'pending' && item.requestedStatus) {
                    targetColumn = item.requestedStatus;
                }
                return targetColumn === status;
            })
            .sort((a, b) => (a.kanban_order || 0) - (b.kanban_order || 0));

        const allCompleted = createColumn('خاتمه یافته');
        
        // By default (showAllCompleted=false), only show items waiting for completion approval.
        const completedToShow = showAllCompleted 
            ? allCompleted 
            : allCompleted.filter(item => item.status === 'ارسال برای تایید' && item.requestedStatus === 'خاتمه یافته');

        return {
            notStarted: createColumn('شروع نشده'),
            inProgress: createColumn('در حال اجرا'),
            completed: completedToShow,
            allCompletedCount: allCompleted.length,
        };
    }, [items, showAllCompleted]);
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        (e.currentTarget as HTMLDivElement).classList.add('drag-over');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        (e.currentTarget as HTMLDivElement).classList.remove('drag-over');
    };

    const handleDrop = (e: React.DragEvent, targetStatus: 'شروع نشده' | 'در حال اجرا' | 'خاتمه یافته') => {
        e.preventDefault();
        (e.currentTarget as HTMLDivElement).classList.remove('drag-over');
        try {
            const sourceItem = JSON.parse(e.dataTransfer.getData('application/json'));
            
            const sourceEffectiveStatus = sourceItem.approvalStatus === 'pending' && sourceItem.requestedStatus ?
                sourceItem.requestedStatus :
                (sourceItem.status === 'ارسال برای تایید' ? sourceItem.underlyingStatus : sourceItem.status);

            if (sourceEffectiveStatus !== targetStatus) {
                // Inter-column drop (status change)
                if (sourceItem.use_workflow === false) return;

                const sourceStatus = sourceItem.status === 'ارسال برای تایید' ? sourceItem.underlyingStatus : sourceItem.status;
                if (sourceStatus === targetStatus) return; 
                if (sourceStatus === 'خاتمه یافته') return; 
                if (sourceStatus === 'در حال اجرا' && targetStatus === 'شروع نشده') return; 

                onStatusChange(sourceItem, targetStatus);
            } else {
                // Intra-column reorder
                const columnItems = items
                    .filter(it => {
                        let status = it.approvalStatus === 'pending' && it.requestedStatus ? it.requestedStatus : (it.status === 'ارسال برای تایید' ? it.underlyingStatus : it.status);
                        return status === targetStatus;
                    })
                    .sort((a, b) => (a.kanban_order || 0) - (b.kanban_order || 0));

                const cards = Array.from((e.currentTarget as HTMLDivElement).querySelectorAll('.kanban-card:not(.dragging)'));
                let targetCard = null;
                for (const card of cards) {
                    const rect = card.getBoundingClientRect();
                    if (e.clientY < rect.top + rect.height / 2) {
                        targetCard = card;
                        break;
                    }
                }

                const reorderedItems = columnItems.filter(it => it.id !== sourceItem.id);
                const targetIndex = targetCard ? reorderedItems.findIndex(it => `${it.type}-${it.id}` === (targetCard as HTMLElement).dataset.id) : reorderedItems.length;
                
                reorderedItems.splice(targetIndex, 0, sourceItem);

                const updates = reorderedItems.map((item, index) => {
                    const newOrder = index * 10;
                    if ((item.kanban_order || 0) !== newOrder) {
                        return { id: item.id, type: item.type, kanban_order: newOrder };
                    }
                    return null;
                }).filter(Boolean) as { id: number; type: string; kanban_order: number }[];

                if (updates.length > 0) {
                    onUpdateItemsOrder(updates);
                }
            }

        } catch (error) {
            console.error("Failed to handle drop:", error);
        }
    };

    return (
        <div className="kanban-board">
            <div className="kanban-column">
                <div className="kanban-column-header">
                    <h3 className="kanban-column-title">شروع نشده ({toPersianDigits(columns.notStarted.length)})</h3>
                </div>
                <div 
                    className="kanban-column-content"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'شروع نشده')}
                >
                    {/* FIX: Wrapped KanbanCard in a React.Fragment and moved the key to it to satisfy TypeScript's prop checking, as 'key' is not a defined prop on the component. */}
                    {columns.notStarted.map(item => (
                        <React.Fragment key={`${item.type}-${item.id}`}>
                            <KanbanCard item={item} onCardClick={onCardClick} />
                        </React.Fragment>
                    ))}
                </div>
            </div>
            <div className="kanban-column">
                <div className="kanban-column-header">
                    <h3 className="kanban-column-title">در حال اجرا ({toPersianDigits(columns.inProgress.length)})</h3>
                </div>
                 <div 
                    className="kanban-column-content"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'در حال اجرا')}
                 >
                    {/* FIX: Wrapped KanbanCard in a React.Fragment and moved the key to it to satisfy TypeScript's prop checking, as 'key' is not a defined prop on the component. */}
                    {columns.inProgress.map(item => (
                        <React.Fragment key={`${item.type}-${item.id}`}>
                            <KanbanCard item={item} onCardClick={onCardClick} />
                        </React.Fragment>
                    ))}
                </div>
            </div>
            <div className="kanban-column">
                <div className="kanban-column-header">
                    <h3 className="kanban-column-title">خاتمه یافته ({toPersianDigits(columns.completed.length)})</h3>
                    <button 
                        onClick={() => setShowAllCompleted(!showAllCompleted)} 
                        className="kanban-header-btn" 
                        title={showAllCompleted ? 'فقط منتظر تایید' : 'نمایش همه خاتمه یافته‌ها'}
                    >
                        {showAllCompleted ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        {!showAllCompleted && columns.allCompletedCount > columns.completed.length && (
                             <span className="kanban-header-btn-text">
                                ({toPersianDigits(columns.allCompletedCount)})
                            </span>
                        )}
                    </button>
                </div>
                 <div 
                    className="kanban-column-content"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'خاتمه یافته')}
                 >
                    {/* FIX: Wrapped KanbanCard in a React.Fragment and moved the key to it to satisfy TypeScript's prop checking, as 'key' is not a defined prop on the component. */}
                    {columns.completed.map(item => (
                        <React.Fragment key={`${item.type}-${item.id}`}>
                            <KanbanCard item={item} onCardClick={onCardClick} />
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};