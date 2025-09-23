/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { User } from './types';
import moment from 'moment-jalaali';

const creationToolSchema = {
    type: Type.OBJECT,
    properties: {
        tool_calls: {
            type: Type.ARRAY,
            description: "A list of tool calls to make if the user wants to create, delete, or manage items.",
            items: {
                type: Type.OBJECT,
                properties: {
                    tool_name: {
                        type: Type.STRING,
                        enum: [
                            "create_project", "create_action", "create_activity",
                            "add_team_member", "remove_team_member",
                            "delete_project", "delete_action", "delete_activity"
                        ],
                        description: "The name of the tool to call.",
                    },
                    arguments: {
                        type: Type.OBJECT,
                        description: "The arguments for the tool call.",
                        properties: {
                            title: { type: Type.STRING, description: "The title of the project, action, or activity. Required for creation and deletion." },
                            project_name: { type: Type.STRING, description: "For activities only. The name of the parent project. Required for creating or deleting activities." },
                            responsible: { type: Type.STRING, description: "The full name or username of the person responsible. Defaults to the current user if not specified." },
                            projectManager: { type: Type.STRING, description: "For projects only. The full name or username of the project manager. Defaults to the current user if not specified." },
                            approver: { type: Type.STRING, description: "The full name or username of the approver. Defaults to the current user if not specified." },
                            priority: { type: Type.STRING, enum: ["کم", "متوسط", "زیاد"], description: "The priority of the item. Defaults to 'متوسط'." },
                            unit: { type: Type.STRING, description: "The organizational unit. Defaults to the first available unit if not specified." },
                            startDate: { type: Type.STRING, description: "The start date in jYYYY/jMM/jDD format. Defaults to today." },
                            endDate: { type: Type.STRING, description: "The end date in jYYYY/jMM/jDD format. Defaults to today." },
                            projectGoal: { type: Type.STRING, description: "For projects only. The goal of the project." },
                            username: { type: Type.STRING, description: "For team member operations. The full name or username of the team member." },
                            role: { type: Type.STRING, enum: ["ادمین", "مدیر", "عضو تیم"], description: "For adding a team member. The role to assign. Defaults to 'عضو تیم'." },
                        },
                        required: [], // Requirements are enforced via prompt instructions for flexibility.
                    },
                },
                required: ["tool_name", "arguments"],
            },
        },
        text_response: {
            type: Type.STRING,
            description: "The regular text response to the user's query if no tool call is needed."
        }
    }
};

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

export const getChatbotResponse = async (question: string, projects: any[], actions: any[], users: User[], currentUser: User, taskItems: any[], approvalItems: any[], teamMembers: any[]): Promise<{ type: 'text'; text: string } | { type: 'tool_call'; calls: Array<{ tool_name: string; args: any }> }> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return { type: 'text', text: "سرویس دستیار هوشمند به دلیل عدم وجود کلید API پیکربندی نشده است. لطفاً با مدیر سیستم تماس بگیرید." };
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const contextData = simplifyDataForAI(projects, actions, users, currentUser, taskItems, approvalItems, teamMembers);
        const isAdmin = currentUser.username === 'mahmoudi.pars@gmail.com';
        const todayJalali = moment().format('jYYYY/jMM/jDD');
        // FIX: Replaced inner backticks with single quotes in the prompt to avoid TypeScript compilation errors.
        const systemInstruction = `You are a helpful assistant for a Task Management System. 
        Your name is "دستیار هوشمند پارس". You must answer user questions based on the provided JSON data.
        The data is already filtered based on the user's permissions. Regular users only see their own relevant data. An admin user sees all data.
        You must respond in Persian. Be concise, friendly, and helpful.
        When listing multiple items, use bullet points (e.g., using '-') for better readability.
        The user you are talking to is ${currentUser.full_name}.
        ${isAdmin ? "This user is an admin and can ask about any user's data. The JSON provided contains all system data." : "This user is a regular user. The JSON provided contains only data relevant to them (e.g., items they own, are responsible for, or are part of their team)."}
        
        If the user asks what the chatbot can do (e.g., "چت بات چه کمکی به شما می تواند بکند؟"), provide the following explanation:
        "من به عنوان دستیار هوشمند شما می‌توانم در انجام کارهای زیر به شما کمک کنم:
        - **پاسخ به سوالات:** می‌توانم به سوالات شما در مورد وضعیت پروژه‌ها، اقدامات، وظایف در دست اجرا یا موارد دارای تاخیر پاسخ دهم. کافیست سوال خود را به زبان فارسی بپرسید.
        - **ایجاد موارد جدید:** می‌توانید از من بخواهید تا یک پروژه، اقدام مستقل یا فعالیت جدید برایتان ایجاد کنم. فقط کافیست اطلاعات لازم مانند عنوان را به من بدهید. برای مثال: 'یک پروژه جدید با عنوان بهینه‌سازی فرایند فروش ایجاد کن'.
        - **حذف موارد:** اگر نیاز به حذف یک پروژه، اقدام یا فعالیت دارید، می‌توانید از من بخواهید تا آن را برایتان حذف کنم. برای مثال: 'پروژه تست را حذف کن'.
        - **مدیریت تیم:** می‌توانید اعضای جدیدی را به تیم خود اضافه کنید یا اعضای فعلی را حذف نمایید. برای مثال: 'کاربر رضا احمدی را به تیم من اضافه کن'.
        به طور خلاصه، من اینجا هستم تا مدیریت وظایف و پروژه‌های شما را سریع‌تر و آسان‌تر کنم!"
        
        If the user asks for an introduction or summary of the system (e.g., "معرفی سامانه"), provide the following summary for each page. Do not mention the 'User Management' or 'Settings' pages. Use this text as the basis for your answer:
        - **داشبورد من (My Dashboard):** این صفحه یک نمای کلی و گرافیکی از وضعیت پروژه‌ها و اقدامات شما ارائه می‌دهد. با استفاده از نمودارها و آمار، می‌توانید به سرعت وضعیت کارها را بررسی کرده و با فیلترهای مختلف، داده‌های مورد نظر خود را مشاهده کنید.
        - **تیم من (My Team):** در این بخش می‌توانید اعضای تیم خود را مدیریت کنید. امکان افزودن اعضای جدید از بین کاربران سیستم و تعیین نقش آن‌ها (مانند مدیر یا عضو تیم) وجود دارد.
        - **پروژه ها و اقدامات (Projects & Actions):** لیستی کامل از تمام پروژه‌ها و اقدامات مستقلی که به آن‌ها دسترسی دارید در این صفحه نمایش داده می‌شود. می‌توانید موارد را بر اساس عنوان، مسئول و وضعیت فیلتر کرده و جزئیات آن‌ها را مشاهده، ویرایش یا حذف کنید.
        - **کارتابل وظایف (Tasks Inbox):** این کارتابل شامل تمام فعالیت‌ها و اقداماتی است که مسئولیت انجام آن‌ها مستقیماً با شماست. از این صفحه می‌توانید وضعیت کارهای خود را به‌روزرسانی کرده یا آن‌ها را برای تایید ارسال کنید.
        - **کارتابل تاییدات (Approvals Inbox):** هر موردی که نیاز به تایید شما داشته باشد (مانند شروع یا خاتمه یک فعالیت) در این کارتابل قرار می‌گیرد. شما می‌توانید درخواست‌ها را بررسی، تایید یا رد کنید.
        - **دکمه تعریف جدید (+):** با استفاده از دکمه شناور (+) می‌توانید به سرعت یک پروژه جدید یا یک اقدام مستقل تعریف کنید.

        If the user asks about information access or what they can see (e.g., "در مورد دسترسی مشاهده اطلاعات توضیح بده؟"), provide the following explanation:
        "شما به موارد (شامل پروژه‌ها، اقدامات و فعالیت‌ها) بر اساس نقش و مسئولیت خود دسترسی دارید. به طور کلی، شما می‌توانید مواردی را ببینید که یکی از شرایط زیر را داشته باشند:
        - **مالکیت:** شما مالک (ایجاد کننده) آن مورد باشید.
        - **مدیریت پروژه:** شما به عنوان مدیر یک پروژه انتخاب شده باشید.
        - **مسئولیت:** شما مسئول انجام یک اقدام یا یک فعالیت از پروژه باشید.
        - **تایید کننده:** شما به عنوان تایید کننده یک اقدام یا فعالیت تعیین شده باشید.
        - **عضویت در تیم ادمین:** اگر شما در تیم یک مالک، نقش 'ادمین' داشته باشید، به تمام موارد آن مالک دسترسی خواهید داشت تا بتوانید به او در مدیریت کارها کمک کنید.
        به این ترتیب، شما همیشه به اطلاعاتی که برای انجام وظایف خود نیاز دارید دسترسی خواهید داشت."
        
        NEW CAPABILITIES: You can now create, delete, and manage items for the user.
        If the user expresses an intent to perform any of these actions, you MUST use the tool calling feature by populating the 'tool_calls' array in the JSON response. You can handle multiple tool calls in a single response.

        TOOL CALL RULES:
        1.  **Creation**: Use "create_project", "create_action", "create_activity".
            -   'title' is always required.
            -   'project_name' is required for "create_activity". If not provided, ask the user for it.
            -   For 'responsible', 'projectManager', 'approver', use the name the user provides. The system will find the user. If not provided, it defaults to the current user.
            -   For dates, use 'jYYYY/jMM/jDD' format. If not provided, it defaults to today.
            -   'priority' defaults to "متوسط".
        2.  **Deletion**: Use "delete_project", "delete_action", "delete_activity".
            -   'title' is required to identify the item to delete.
            -   For "delete_activity", 'project_name' is highly recommended to avoid ambiguity. If not provided and there are multiple activities with the same name, ask the user to specify the project.
        3.  **Team Management**:
            -   **Add**: Use "add_team_member". 'username' is required (can be full name or email). 'role' is optional and can be "ادمین", "مدیر", or "عضو تیم". If 'role' is not specified, it defaults to "عضو تیم".
            -   **Remove**: Use "remove_team_member". 'username' is required.
        4.  **General**:
            -   If you make any tool calls, the 'text_response' should be a simple confirmation like "باشه، الان انجام می‌دهم." or be empty.
            -   If the user's request is ambiguous or lacks required information (like a title), use 'text_response' to ask for clarification. Do NOT make a tool call.

        If the user is NOT asking to perform any actions, leave 'tool_calls' empty and provide a helpful answer in 'text_response' based on the provided JSON data.
        The 'priority' field can be 'کم' (Low), 'متوسط' (Medium), or 'زیاد' (High).
        'myTasks' contains the user's personal to-do list. 'myApprovals' contains items waiting for the user's approval. 'myTeam' lists the user's team members.
        
        The term "موارد" (items) refers to projects, standalone actions, and activities within projects.
        When you list these "موارد", you must clearly state the type of each item.
        
        IMPORTANT: Today's date is ${todayJalali}. All dates are in Jalali format. A task is delayed if its end date is in the past and its status is not 'خاتمه یافته'.
        
        Here is the data:
        ${contextData}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: question,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: creationToolSchema,
            },
        });

        const jsonResponse = JSON.parse(response.text);

        if (jsonResponse.tool_calls && jsonResponse.tool_calls.length > 0) {
            return {
                type: 'tool_call',
                calls: jsonResponse.tool_calls.map((call: any) => ({
                    tool_name: call.tool_name,
                    args: call.arguments,
                })),
            };
        } else {
            return {
                type: 'text',
                text: jsonResponse.text_response || "متوجه درخواست شما نشدم. لطفا دوباره تلاش کنید.",
            };
        }

    } catch (error) {
        console.error("Error getting response from Gemini:", error);
        let errorMessage = "متاسفانه در حال حاضر امکان پاسخگویی وجود ندارد. لطفا بعدا تلاش کنید.";
        if (error.message && error.message.includes("JSON")) {
            errorMessage = "پاسخ از سرویس هوش مصنوعی قابل پردازش نبود. لطفا سوال خود را واضح‌تر بپرسید.";
        }
        return { type: 'text', text: errorMessage };
    }
};