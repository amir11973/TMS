/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import moment from 'moment-jalaali';
import { HistoryIcon } from '../icons';
import { toPersianDigits } from '../utils';

export const CompletedTasksModal = ({ isOpen, onClose, items, onShowHistory }: { isOpen: boolean; onClose: () => void; items: any[], onShowHistory: (item: any) => void; }) => {
    if (!isOpen) return null;

    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            const getCompletionDate = (item: any) => {
                if (!item.history) return 0;
                const history = [...item.history].reverse();
                let entry = history.find(h => h.approvalDecision === 'approved' && h.status === 'خاتمه یافته');
                if (!entry) {
                    entry = history.find(h => h.status === 'خاتمه یافته');
                }
                return entry ? new Date(entry.date).getTime() : 0;
            };

            return getCompletionDate(b) - getCompletionDate(a);
        });
    }, [items]);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content completed-tasks-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>خاتمه یافته ها</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body modal-body-with-table">
                    <div className="table-container">
                        <table className="user-list-table completed-tasks-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>عنوان</th>
                                    <th>تاریخچه</th>
                                    <th>تاریخ تایید نهایی</th>
                                    <th>پروژه / اقدام</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedItems.length > 0 ? sortedItems.map((item, index) => {
                                    // First, look for the explicit approval history entry for workflow items
                                    let finalApprovalEntry = item.history?.slice().reverse().find((h:any) => h.approvalDecision === 'approved' && h.status === 'خاتمه یافته');
                                    
                                    // If not found (e.g., for non-workflow items), find the last entry where status became 'خاتمه یافته'
                                    if (!finalApprovalEntry) {
                                        finalApprovalEntry = item.history?.slice().reverse().find((h:any) => h.status === 'خاتمه یافته');
                                    }

                                    const finalApprovalDate = finalApprovalEntry ? moment(finalApprovalEntry.date).format('jYYYY/jMM/jDD') : '—';
                                    
                                    return (
                                        <tr key={`${item.type}-${item.id}`}>
                                            <td>{toPersianDigits(index + 1)}</td>
                                            <td>{item.title}</td>
                                            <td>
                                                <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(item)}>
                                                    <HistoryIcon />
                                                </button>
                                            </td>
                                            <td>{finalApprovalDate}</td>
                                            <td>{item.parentName}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center' }}>هیچ فعالیت خاتمه یافته‌ای یافت نشد.</td>
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