/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useMemo } from 'react';
import moment from 'moment-jalaali';
import { User } from '../types';

export const HistoryModal = ({ isOpen, onClose, history, users }: { isOpen: boolean; onClose: () => void; history: any[]; users: User[] }) => {
    if (!isOpen) return null;

    const userMap = useMemo(() => new Map(users.map(u => [u.username, u.full_name || u.username])), [users]);

    return (
        <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>تاریخچه تغییرات</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {history && history.map((entry, index) => {
                         let approvalStatusText = '';
                         if (entry?.status === 'ارسال برای تایید') {
                             approvalStatusText = 'ارسال شده برای تایید';
                         } else if (entry?.approvalDecision === 'approved') {
                             approvalStatusText = 'تایید شده';
                         } else if (entry?.approvalDecision === 'rejected') {
                             approvalStatusText = 'رد شده';
                         }
                        
                        const userName = userMap.get(entry?.user) || entry?.user || 'نامشخص';
                        const isDecisionEntry = entry.hasOwnProperty('requestComment');
                        const sourcePrefix = entry._sourceItem && entry._sourceItem !== 'والد اصلی' ? `[${entry._sourceItem}] ` : '';

                        return (
                            <div className="history-detail-item" key={index}>
                               {entry.parentTitle && <p><strong>مورد:</strong> {entry.parentTitle}</p>}
                               <p><strong>وضعیت:</strong> {sourcePrefix}{entry?.status ?? 'نامشخص'} {entry?.requestedStatus ? `(درخواست برای ${entry.requestedStatus})` : ''}</p>
                               {approvalStatusText && <p><strong>وضعیت تایید:</strong> {approvalStatusText}</p>}
                               <p><strong>نام کاربر:</strong> {userName}</p>
                               <p><strong>تاریخ:</strong> {entry?.date ? moment(entry.date).format('jYYYY/jMM/jDD HH:mm') : 'نامشخص'}</p>
                               {entry.requestComment && <p><strong>توضیحات ارسال کننده:</strong> {entry.requestComment}</p>}
                               {entry.requestFileName && entry.requestFileUrl && (
                                    <p>
                                        <strong>فایل ارسال کننده:</strong>
                                        <a href={entry.requestFileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-primary)', textDecoration: 'none', marginRight: '5px' }}>
                                            {entry.requestFileName}
                                        </a>
                                    </p>
                                )}
                               {entry?.comment && <p><strong>{isDecisionEntry ? 'توضیحات شما (تایید کننده):' : 'توضیحات:'}</strong> {entry.comment}</p>}
                               {entry?.details && <p><strong>جزئیات:</strong> {entry.details}</p>}
                               {entry?.fileName && entry?.fileUrl && !entry.requestFileName && (
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