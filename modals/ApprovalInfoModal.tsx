/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const ApprovalInfoModal = ({ isOpen, onClose, item }: { isOpen: boolean; onClose: () => void; item: any }) => {
    if (!isOpen || !item) return null;

    const approvalRequestInfo = [...(item.history || [])].reverse().find(
        (h) => h.status === 'ارسال برای تایید' && h.requestedStatus === item.requestedStatus
    );

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>اطلاعات ارسال برای تایید</h3>
                    <button type="button" className="close-button" onClick={onClose}>
                        &times;
                    </button>
                </div>
                <div className="modal-body">
                    <div className="detail-group full-width">
                        <span className="detail-label">مورد</span>
                        <p className="detail-value">{item.title}</p>
                    </div>
                    <div className="detail-group full-width">
                        <span className="detail-label">توضیحات ارسال کننده</span>
                        <p className="detail-value">
                            {approvalRequestInfo?.comment || 'توضیحاتی ثبت نشده است.'}
                        </p>
                    </div>
                    <div className="detail-group full-width">
                        <span className="detail-label">سند الصاق شده</span>
                        <p className="detail-value">
                            {approvalRequestInfo?.fileName || 'سندی الصاق نشده است.'}
                        </p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
};
