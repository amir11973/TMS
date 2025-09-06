/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const AlertModal = ({ isOpen, onClose, title, message }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content confirmation-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="confirmation-message">{message}</p>
                </div>
                <div className="modal-footer" style={{ justifyContent: 'center' }}>
                    <button type="button" className="save-btn" onClick={onClose} style={{ width: 'auto', minWidth: '120px' }}>متوجه شدم</button>
                </div>
            </div>
        </div>
    );
};
