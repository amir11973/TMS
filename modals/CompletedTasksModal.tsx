/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import moment from 'moment-jalaali';

export const CompletedTasksModal = ({ isOpen, onClose, items }: { isOpen: boolean; onClose: () => void; items: any[] }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>فعالیت‌های خاتمه یافته</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="table-container" style={{ maxHeight: '60vh' }}>
                        <table className="user-list-table">
                            <thead>
                                <tr>
                                    <th>عنوان</th>
                                    <th>پروژه / اقدام</th>
                                    <th>تاریخ پایان</th>
                                    <th>تاریخ تایید نهایی</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length > 0 ? items.map(item => {
                                    const finalApprovalEntry = item.history?.slice().reverse().find(h => h.approvalDecision === 'approved' && h.status === 'خاتمه یافته');
                                    const finalApprovalDate = finalApprovalEntry ? moment(finalApprovalEntry.date).format('jYYYY/jMM/jDD') : '—';
                                    
                                    return (
                                        <tr key={`${item.type}-${item.id}`}>
                                            <td>{item.title}</td>
                                            <td>{item.parentName}</td>
                                            <td>{moment(item.endDate).format('jYYYY/jMM/jDD')}</td>
                                            <td>{finalApprovalDate}</td>
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
