/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import moment from 'moment-jalaali';

export const HistoryModal = ({ isOpen, onClose, history }: { isOpen: boolean; onClose: () => void; history: any[] }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>تاریخچه تغییرات</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {history && history.slice().reverse().map((entry, index) => {
                         let approvalStatusText = '';
                         if (entry?.status === 'ارسال برای تایید') {
                             approvalStatusText = 'ارسال شده برای تایید';
                         } else if (entry?.approvalDecision === 'approved') {
                             approvalStatusText = 'تایید شده';
                         } else if (entry?.approvalDecision === 'rejected') {
                             approvalStatusText = 'رد شده';
                         }
                        
                        return (
                            <div className="history-detail-item" key={index}>
                               {entry.parentTitle && <p><strong>مورد:</strong> {entry.parentTitle}</p>}
                               <p><strong>وضعیت:</strong> {entry?.status ?? 'نامشخص'} {entry?.requestedStatus ? `(درخواست برای ${entry.requestedStatus})` : ''}</p>
                               {approvalStatusText && <p><strong>وضعیت تایید:</strong> {approvalStatusText}</p>}
                               <p><strong>کاربر:</strong> {entry?.user ?? 'نامشخص'}</p>
                               <p><strong>تاریخ:</strong> {entry?.date ? moment(entry.date).format('jYYYY/jMM/jDD HH:mm') : 'نامشخص'}</p>
                               {entry?.comment && <p><strong>توضیحات:</strong> {entry.comment}</p>}
                               {entry?.details && <p><strong>جزئیات:</strong> {entry.details}</p>}
                               {entry?.fileName && entry?.fileUrl && (
                                    <p>
                                        <strong>فایل:</strong>
                                        <a href={entry.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-primary)', textDecoration: 'none', marginRight: '5px' }}>
                                            {entry.fileName}
                                        </a>
                                    </p>
                                )}
                               <hr style={{border: '1px solid var(--c-border)', margin: '10px 0'}}/>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};