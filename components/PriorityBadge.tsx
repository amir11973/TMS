/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export const renderPriorityBadge = (priority: string | null | undefined) => {
    if (!priority) return '—';
    const priorityClass = {
        'کم': 'low',
        'متوسط': 'medium',
        'زیاد': 'high'
    }[priority] || 'medium';

    return <span className={`priority-badge priority-${priorityClass}`}>{priority}</span>;
};

export const renderStatusBadge = (status: string | null | undefined, approvalStatusText?: string | null) => {
    let text = approvalStatusText || status;
    if (!text) return <span className="status-badge status-default">—</span>;

    let className = 'status-badge';
    
    // Determine class based on text
    if (text === 'تایید شده') {
        className += ' status-approved';
    } else if (text === 'رد شده') {
        className += ' status-rejected';
    } else if (text.startsWith('منتظر تایید')) {
        className += ' status-pending-approval';
    } else if (text === 'گردش کار غیرفعال') {
        className += ' status-workflow-disabled';
    } else {
        // Fallback to general status
        const colorMap: { [key: string]: string } = {
            'شروع نشده': 'not-started',
            'در حال اجرا': 'in-progress',
            'خاتمه یافته': 'completed',
        };
        const matchingKey = Object.keys(colorMap).find(key => key === status);
        className += matchingKey ? ` status-${colorMap[matchingKey]}` : ' status-default';
    }
    
    return <span className={className}>{text}</span>;
};