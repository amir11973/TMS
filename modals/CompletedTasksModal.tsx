/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import moment from 'moment-jalaali';
import { HistoryIcon } from '../icons';

export const CompletedTasksModal = ({ isOpen, onClose, items, onShowHistory }: { isOpen: boolean; onClose: () => void; items: any[], onShowHistory: (history: any[]) => void; }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content completed-tasks-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>خاتمه یافته ها</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="table-container" style={{ maxHeight: '60vh' }}>
                        <table className="user-list-table completed-tasks-table">
                            <thead>
                                <tr>
                                    <th>عنوان</th>
                                    <th>پروژه / اقدام</th>
                                    <th>تاریخ تایید نهایی</th>
                                    <th>تاریخچه</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length > 0 ? items.map(item => {
                                    // First, look for the explicit approval history entry for workflow items
                                    let finalApprovalEntry = item.history?.slice().reverse().find(h => h.approvalDecision === 'approved' && h.status === 'خاتمه یافته');
                                    
                                    // If not found (e.g., for non-workflow items), find the last entry where status became 'خاتمه یافته'
                                    if (!finalApprovalEntry) {
                                        finalApprovalEntry = item.history?.slice().reverse().find(h => h.status === 'خاتمه یافته');
                                    }

                                    const finalApprovalDate = finalApprovalEntry ? moment(finalApprovalEntry.date).format('jYYYY/jMM/jDD') : '—';
                                    
                                    return (
                                        <tr key={`${item.type}-${item.id}`}>
                                            <td>{item.title}</td>
                                            <td>{item.parentName}</td>
                                            <td>{finalApprovalDate}</td>
                                            <td>
                                                <button className="icon-btn history-btn" title="تاریخچه" onClick={() => onShowHistory(item.history)}>
                                                    <HistoryIcon />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center' }}>هیچ فعالیت خاتمه یافته‌ای یافت نشد.</td>
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