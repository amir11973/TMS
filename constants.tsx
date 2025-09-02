

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { User, TeamMember } from './types';
import { DashboardIcon, ListIcon, ProjectIcon, TasksIcon, ApprovalsIcon, UsersIcon, SettingsIcon, TeamIcon } from './icons';

// --- Utility Functions ---
export const getTodayString = () => new Date().toISOString().split('T')[0];

// --- Data ---
export const menuItems = [
  { name: 'داشبورد من', icon: <DashboardIcon />, id: 'dashboard' },
  { name: 'تیم من', icon: <TeamIcon />, id: 'my_team' },
  { name: 'لیست پروژه ها و اقدامات', icon: <ListIcon />, id: 'projects_actions_list' },
  { name: 'تعریف پروژه و اقدام', icon: <ProjectIcon />, id: 'define_new' },
  { name: 'کارتابل وظایف', icon: <TasksIcon />, id: 'tasks' },
  { name: 'کارتابل تاییدات', icon: <ApprovalsIcon />, id: 'approvals' },
  { name: 'مدیریت کاربران', icon: <UsersIcon />, id: 'users' },
  { name: 'تنظیمات', icon: <SettingsIcon />, id: 'settings' },
];
