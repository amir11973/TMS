/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
            <div className="modal-content confirmation-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="confirmation-message">{message}</p>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>انصراف</button>
                    <button type="button" className="confirm-btn-danger" onClick={onConfirm}>تایید</button>
                </div>
            </div>
        </div>
    );
};