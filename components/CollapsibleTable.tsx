/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { PlusIcon, MinusIcon, GroupCollapsedIcon } from '../icons';
import { toPersianDigits } from '../utils';

export const CollapsibleTableSection = ({ title, count, children, iconType = 'plus-minus', defaultOpen = false, level = 0 }: {
    title: string;
    count: number;
    children: React.ReactNode;
    iconType?: 'plus-minus' | 'equals-minus';
    defaultOpen?: boolean;
    level?: number;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const ToggleIcon = () => {
        if (iconType === 'plus-minus') {
            return isOpen ? <MinusIcon /> : <PlusIcon />;
        }
        // For 'equals-minus'
        return isOpen ? <MinusIcon /> : <GroupCollapsedIcon />;
    };

    if (React.Children.count(children) === 0) {
        return null;
    }

    return (
        <>
            <tr className={`group-header-row group-level-${level}`} onClick={() => setIsOpen(!isOpen)} title={isOpen ? 'بستن گروه' : 'باز کردن گروه'}>
                <td colSpan={100}>
                    <span style={{ paddingRight: `${level * 24}px` }}>
                        <ToggleIcon />
                        <span className="group-header-title">{title}</span>
                        <span className="group-header-count">({toPersianDigits(count)} مورد)</span>
                    </span>
                </td>
            </tr>
            {isOpen && children}
        </>
    );
};
