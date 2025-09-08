/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import moment from 'moment-jalaali';
import { User } from './types';

export const UserInfoModal = ({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: User | null }) => {
    if (!isOpen || !user) return null;

    const format_date = (date_string: string | null | undefined) => {
        if (!date_string) return 'هرگز';
        return moment(date_string).format('jYYYY/jMM/jDD HH:mm:ss');
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>اطلاعات کاربر: {user.full_name}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-group">
                            <span className="detail-label">نام کاربری</span>
                            <p className="detail-value">{user.username}</p>
                        </div>
                        <div className="detail-group">
                            <span className="detail-label">تاریخ ثبت نام</span>
                            <p className="detail-value">{format_date(user.created_at)}</p>
                        </div>
                            <div className="detail-group">
                            <span className="detail-label">آخرین ورود</span>
                            <p className="detail-value">{format_date(user.last_login)}</p>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>بستن</button>
                </div>
            </div>
        </div>
    );
};
