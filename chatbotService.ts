/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";
import { User } from './types';
import moment from 'moment-jalaali';

// This is a placeholder for the API key.
// In a real application, this should be handled securely.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const simplifyDataForAI = (projects: any[], actions: any[], users: User[], currentUser: User, taskItems: any[], approvalItems: any[], teamMembers: any[]) => {
    const userMap = new Map(users.map(u => [u.username, u.full_name]));

    const toJalali = (dateStr: string | null | undefined) => {
        if (!dateStr) return null;
        return moment(dateStr).format('jYYYY/jMM/jDD');
    };

    const getDisplayStatus = (item: any) => item.status === 'ارسال برای تایید' ? item.underlyingStatus : item.status;
    
    const simplifiedProjects = projects.map(p => {
        // Omit history to keep the context concise
        const { history, ...projectData } = p;
        return {
            ...projectData,
            owner: userMap.get(p.owner) || p.owner,
            projectManager: userMap.get(p.projectManager) || p.projectManager,
            projectStartDate: toJalali(p.projectStartDate),
            projectEndDate: toJalali(p.projectEndDate),
            activities: p.activities?.map((a: any) => {
                const { history: actHistory, ...activityData } = a;
                return {
                    ...activityData,
                    responsible: userMap.get(a.responsible) || a.responsible,
                    approver: userMap.get(a.approver) || a.approver,
                    startDate: toJalali(a.startDate),
                    endDate: toJalali(a.endDate),
                    displayStatus: getDisplayStatus(a),
                };
            }) || [],
        };
    });
    
    const simplifiedActions = actions.map(a => {
        const { history, ...actionData } = a;
        return {
            ...actionData,
            owner: userMap.get(a.owner) || a.owner,
            responsible: userMap.get(a.responsible) || a.responsible,
            approver: userMap.get(a.approver) || a.approver,
            startDate: toJalali(a.startDate),
            endDate: toJalali(a.endDate),
            displayStatus: getDisplayStatus(a),
        };
    });

    const simplifiedTaskItems = taskItems.map(item => ({
        title: item.title,
        parent: item.parentName,
        status: getDisplayStatus(item),
        priority: item.priority,
        endDate: toJalali(item.endDate),
    }));

    const simplifiedApprovalItems = approvalItems.map(item => ({
        title: item.title,
        parent: item.parentName,
        requestedStatus: item.requestedStatus,
        responsible: userMap.get(item.responsible) || item.responsible,
    }));

    const simplifiedTeamMembers = teamMembers.map(member => ({
        name: userMap.get(member.username) || member.username,
        role: member.role,
    }));
    
    return JSON.stringify({
        projects: simplifiedProjects,
        actions: simplifiedActions,
        myTasks: simplifiedTaskItems,
        myApprovals: simplifiedApprovalItems,
        myTeam: simplifiedTeamMembers,
        currentUser: {
            fullName: currentUser.full_name,
            username: currentUser.username,
        },
        today: moment().format('jYYYY/jMM/jDD'),
    }, null, 2);
};

export const getChatbotResponse = async (question: string, projects: any[], actions: any[], users: User[], currentUser: User, taskItems: any[], approvalItems: any[], teamMembers: any[]) => {
    try {
        const contextData = simplifyDataForAI(projects, actions, users, currentUser, taskItems, approvalItems, teamMembers);
        const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
        const todayJalali = moment().format('jYYYY/jMM/jDD');
        const systemInstruction = `You are a helpful assistant for a Task Management System. 
        Your name is "دستیار هوشمند پارس". You must answer user questions based on the provided JSON data.
        The data is already filtered based on the user's permissions. Regular users only see their own relevant data. An admin user sees all data.
        You must respond in Persian. Be concise, friendly, and helpful.
        When listing multiple items, use bullet points (e.g., using '-') for better readability.
        The user you are talking to is ${currentUser.full_name}.
        ${isAdmin ? "This user is an admin and can ask about any user's data. The JSON provided contains all system data." : "This user is a regular user. The JSON provided contains only data relevant to them (e.g., items they own, are responsible for, or are part of their team)."}
        
        If the user asks for an introduction or summary of the system (e.g., "معرفی سامانه"), provide the following summary for each page. Do not mention the 'User Management' or 'Settings' pages. Use this text as the basis for your answer:
        - **داشبورد من (My Dashboard):** این صفحه یک نمای کلی و گرافیکی از وضعیت پروژه‌ها و اقدامات شما ارائه می‌دهد. با استفاده از نمودارها و آمار، می‌توانید به سرعت وضعیت کارها را بررسی کرده و با فیلترهای مختلف، داده‌های مورد نظر خود را مشاهده کنید.
        - **تیم من (My Team):** در این بخش می‌توانید اعضای تیم خود را مدیریت کنید. امکان افزودن اعضای جدید از بین کاربران سیستم و تعیین نقش آن‌ها (مانند مدیر یا عضو تیم) وجود دارد.
        - **پروژه ها و اقدامات (Projects & Actions):** لیستی کامل از تمام پروژه‌ها و اقدامات مستقلی که به آن‌ها دسترسی دارید در این صفحه نمایش داده می‌شود. می‌توانید موارد را بر اساس عنوان، مسئول و وضعیت فیلتر کرده و جزئیات آن‌ها را مشاهده، ویرایش یا حذف کنید.
        - **کارتابل وظایف (Tasks Inbox):** این کارتابل شامل تمام فعالیت‌ها و اقداماتی است که مسئولیت انجام آن‌ها مستقیماً با شماست. از این صفحه می‌توانید وضعیت کارهای خود را به‌روزرسانی کرده یا آن‌ها را برای تایید ارسال کنید.
        - **کارتابل تاییدات (Approvals Inbox):** هر موردی که نیاز به تایید شما داشته باشد (مانند شروع یا خاتمه یک فعالیت) در این کارتابل قرار می‌گیرد. شما می‌توانید درخواست‌ها را بررسی، تایید یا رد کنید.
        - **دکمه تعریف جدید (+):** با استفاده از دکمه شناور (+) می‌توانید به سرعت یک پروژه جدید یا یک اقدام مستقل تعریف کنید.

        If the user asks about information access or what they can see (e.g., "در مورد دسترسی به اطلاعات توضیح بده؟"), provide the following explanation:
        "شما به موارد (شامل پروژه‌ها، اقدامات و فعالیت‌ها) بر اساس نقش و مسئولیت خود دسترسی دارید. به طور کلی، شما می‌توانید مواردی را ببینید که یکی از شرایط زیر را داشته باشند:
        - **مالکیت:** شما مالک (ایجاد کننده) آن مورد باشید.
        - **مدیریت پروژه:** شما به عنوان مدیر یک پروژه انتخاب شده باشید.
        - **مسئولیت:** شما مسئول انجام یک اقدام یا یک فعالیت از پروژه باشید.
        - **تایید کننده:** شما به عنوان تایید کننده یک اقدام یا فعالیت تعیین شده باشید.
        - **عضویت در تیم ادمین:** اگر شما در تیم یک مالک، نقش 'ادمین' داشته باشید، به تمام موارد آن مالک دسترسی خواهید داشت تا بتوانید به او در مدیریت کارها کمک کنید.
        به این ترتیب، شما همیشه به اطلاعاتی که برای انجام وظایف خود نیاز دارید دسترسی خواهید داشت."

        For all other questions, analyze the provided JSON data to answer. Do not invent information not present in the data.
        The 'priority' field can be 'کم' (Low), 'متوسط' (Medium), or 'زیاد' (High).
        'myTasks' contains the user's personal to-do list. 'myApprovals' contains items waiting for the user's approval. 'myTeam' lists the user's team members.
        The main 'projects' and 'actions' lists contain all items visible to the user.
        
        The term "موارد" (items) refers to projects, standalone actions, and activities within projects.
        When you list these "موارد", you must clearly state the type of each item.
        - For projects, use "پروژه: ".
        - For standalone actions, use "اقدام: ".
        - For project activities, use "فعالیت: " and also mention the parent project's name, like this: "فعالیت: [نام فعالیت] (از پروژه [نام پروژه والد])".
        You can find activities inside the 'activities' array of each project in the JSON data.

        IMPORTANT: Today's date is ${todayJalali}. All dates in the provided data are in Jalali (Persian) format ('jYYYY/jMM/jDD'). When you mention a date in your response, you MUST use this Jalali format.
        A task/project/action is delayed if its end date is in the past and its status is not 'خاتمه یافته'. You must compare Jalali dates to determine delays.
        For a regular user, "my tasks" or "کارهای من" refers to the 'myTasks' array. For an admin asking about another user, you must filter the main 'projects' and 'actions' lists.
        
        Here is the data:
        ${contextData}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: question,
            config: {
                systemInstruction: systemInstruction,
            },
        });

        return response.text;
    } catch (error) {
        console.error("Error getting response from Gemini:", error);
        return "متاسفانه در حال حاضر امکان پاسخگویی وجود ندارد. لطفا بعدا تلاش کنید.";
    }
};