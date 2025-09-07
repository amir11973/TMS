/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';

export const SendApprovalModal = ({ isOpen, onClose, onSend, requestedStatus }: {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: { comment: string, file: File | null }) => void;
    requestedStatus: string;
}) => {
    const [comment, setComment] = useState('');
    const [file, setFile] = useState<File | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSend = () => {
        onSend({ comment, file });
        setComment('');
        setFile(null);
    };
    
    const handleClose = () => {
        setComment('');
        setFile(null);
        onClose();
    }
    
    let title = "ارسال برای تایید";
    if (requestedStatus === 'در حال اجرا') {
        title = "ارسال برای تایید شروع";
    } else if (requestedStatus === 'خاتمه یافته') {
        title = "ارسال برای تایید خاتمه";
    }


    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="close-button" onClick={handleClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="input-group">
                        <label htmlFor="approval-comment">توضیحات (اختیاری)</label>
                        <textarea 
                            id="approval-comment" 
                            rows={4} 
                            value={comment} 
                            onChange={e => setComment(e.target.value)}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="approval-file">الصاق فایل (اختیاری)</label>
                        <input 
                            type="file" 
                            id="approval-file" 
                            onChange={handleFileChange}
                        />
                        {file && <span className="file-name-display">{file.name}</span>}
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={handleClose}>انصراف</button>
                    <button type="button" className="save-btn" onClick={handleSend}>ارسال</button>
                </div>
            </div>
        </div>
    );
};