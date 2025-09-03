/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';

export const ApprovalDecisionModal = ({ isOpen, onClose, onConfirm, decisionType }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (comment: string) => void;
    decisionType: string;
}) => {
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (isOpen) {
            setComment('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(comment);
    };

    const title = decisionType === 'approved' ? 'تایید آیتم' : 'رد آیتم';
    const message = decisionType === 'approved' 
        ? 'آیا از تایید این مورد اطمینان دارید؟' 
        : 'آیا از رد این مورد اطمینان دارید؟';

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p style={{marginBottom: '16px'}}>{message}</p>
                    <div className="input-group">
                        <label htmlFor="decision-comment">توضیحات (اختیاری)</label>
                        <textarea 
                            id="decision-comment" 
                            rows={4} 
                            value={comment} 
                            onChange={e => setComment(e.target.value)}
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                    <button 
                        type="button" 
                        className={decisionType === 'approved' ? 'approve-btn' : 'reject-btn'} 
                        onClick={handleConfirm}
                    >
                        {decisionType === 'approved' ? 'تایید' : 'رد'}
                    </button>
                </div>
            </div>
        </div>
    );
};
