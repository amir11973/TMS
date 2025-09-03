/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { ProjectIcon, ActionIcon } from '../icons';

export const ChoiceModal = ({ isOpen, onClose, onProject, onAction }: {
    isOpen: boolean;
    onClose: () => void;
    onProject: () => void;
    onAction: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content choice-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>تعریف مورد جدید</h3>
                    <button type="button" className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="choice-message">قصد تعریف کدام مورد را دارید؟</p>
                </div>
                <div className="modal-footer choice-footer">
                    <button type="button" className="choice-btn" onClick={onProject}>
                        <ProjectIcon />
                        <span>پروژه</span>
                    </button>
                    <button type="button" className="choice-btn" onClick={onAction}>
                        <ActionIcon />
                        <span>اقدام</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
