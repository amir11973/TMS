/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import { User } from '../types';
import { toPersianDigits } from '../utils';
import { HistoryIcon, DetailsIcon } from '../icons';
import { renderStatusBadge } from '../components';

export const DelegatedItemsModal = ({ isOpen, onClose, currentUser, allActivities, allActions, users, onShowHistory, onViewDetails }: {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    allActivities: any[];
    allActions: any[];
    users: User[];
    onShowHistory: (history: any[]) => void;
    onViewDetails: (item: any) => void;
}) => {
    
    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);
    const activityMap = useMemo(() => new Map(allActivities.map(a => [a.id, a])), [allActivities]);
    const actionMap = useMemo(() => new Map(allActions.map(a => [a.id, a])), [allActions]);

    const delegatedItems = useMemo(() => {
        if (!currentUser) return [];
        const allSubtasks = [
            ...allActivities.filter(a => a.parent_id),
            ...allActions.filter(a => a.parent_id)
        ];

        return allSubtasks
            .map(item => {
                const isActivity = !!item.project_id;
                const parentMap = isActivity ? activityMap : actionMap;
                const parent = parentMap.get(item.parent_id);
                // Check if the current user is responsible for the parent task
                if (parent && parent.responsible === currentUser.username) {
                    return {
                        ...item,
                        parentTitle: parent.title,
                    };
                }
                return null;
            })
            .filter(Boolean)
            .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [currentUser, allActivities, allActions, activityMap, actionMap]);


    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content mass-delegate-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>موارد واگذار شده توسط شما</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body modal-body-with-table">
                    <div className="table-container">
                        <table className="user-list-table mass-delegate-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>عنوان زیرفعالیت</th>
                                    <th>فعالیت والد</th>
                                    <th>جزئیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {delegatedItems.length > 0 ? delegatedItems.map((item, index) => {
                                    return (
                                        <tr key={`${item.type}-${item.id}`}>
                                            <td>{toPersianDigits(index + 1)}</td>
                                            <td>{item.title}</td>
                                            <td>{item.parentTitle}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory([...(item.history || [])].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()))}>
                                                        <HistoryIcon />
                                                    </button>
                                                     <button className="icon-btn details-btn" title="جزئیات" onClick={() => onViewDetails(item)}>
                                                        <DetailsIcon />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center' }}>شما تاکنون موردی را واگذار نکرده‌اید.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>بستن</button>
                </div>
            </div>
        </div>
    );
};