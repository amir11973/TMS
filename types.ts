

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type UserRole = 'ادمین' | 'مدیر پروژه' | 'تیم پروژه';

export type User = {
    id: number;
    username: string;
    full_name: string;
    password_hash?: string; // Optional for security when passing around
    role: UserRole;
    is_active: boolean;
    theme?: string;
    created_at: string;
    last_login?: string | null;
};

export type ItemStatus = 'شروع نشده' | 'در حال اجرا' | 'ارسال برای تایید' | 'خاتمه یافته' | 'رد شده';

export type TeamMemberRole = 'ادمین' | 'مدیر' | 'عضو تیم';

export type TeamMember = {
    username: string;
    role: TeamMemberRole;
};