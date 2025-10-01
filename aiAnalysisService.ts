/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import moment from 'moment-jalaali';

interface AnalysisTask {
    title: string;
    priority: string;
    endDate: string;
    roles: string;
    startDate: string;
}

export const getAiAnalysis = async (
    notStarted: AnalysisTask[], 
    inProgress: AnalysisTask[],
    onTimeNotStarted: AnalysisTask[],
    onTimeInProgress: AnalysisTask[]
): Promise<string> => {
    try {
        const todayJalali = moment().format('jYYYY/jMM/jDD');
        
        const systemInstruction = `You are an expert project management analyst named "تحلیلگر هوشمند پارس". Your task is to analyze a list of tasks for a user and provide a concise, prioritized summary in Persian. The frontend will handle the visual display.
Your tone should be professional, helpful, and motivating.
You MUST structure your response as follows, using these exact markers:
1.  Start with a brief, encouraging opening like "سلام! بر اساس تحلیل وظایف شما، موارد زیر باتوجه به اولویت آنها، نیاز به توجه ویژه دارند:".
2.  If there are overdue not-started tasks, add a line that says: "SECTION_HEADER:وظایف شروع نشده با تاخیر". Then, on new lines, list each task using the format "LIST_ITEM:{priority}|{title}|{endDate}|{roles}". The priority must be one of 'زیاد', 'متوسط', or 'کم'. The roles string indicates the user's relationship to the task (e.g., 'مالک، مسئول'). The tasks are pre-sorted first by start date (earliest first), and then by priority (high to low). The endDate must be in 'jYYYY/jMM/jDD' format.
3.  If there are overdue in-progress tasks, add a line that says: "SECTION_HEADER:وظایف در حال اجرا با تاخیر". Then, on new lines, list each task using the same format: "LIST_ITEM:{priority}|{title}|{endDate}|{roles}".
4.  If there are on-time tasks (either not started or in progress), add a new section that starts directly with the header specified in the next step. DO NOT add any introductory sentence before this header.
5.  The header for on-time tasks is: "SECTION_HEADER:وظایف در صف انجام (فاقد تاخیر)".
6.  List all on-time tasks (both not started and in progress) under this header using the same format: "LIST_ITEM:{priority}|{title}|{endDate}|{roles}".
7.  If a section has no tasks, DO NOT include its introductory sentence or its "SECTION_HEADER:" line.
8.  End with the exact closing statement: "با اولویت‌بندی این وظایف، می‌توانید کنترل کاملی بر کارها داشته باشید. موفق باشید!".

Example for a not-started task with high priority:
SECTION_HEADER:وظایف شروع نشده با تاخیر
LIST_ITEM:زیاد|طراحی صفحه اصلی|1403/05/10|مسئول

Your final response must be a single string with newlines separating each part. Do not use any markdown.`;

        let userPrompt = `Here is a list of my tasks. Please analyze them and provide a summary. Today's date is ${todayJalali}.\n\n`;

        if (notStarted.length > 0) {
            userPrompt += "Overdue Not Started Tasks (sorted by start date, then priority):\n";
            notStarted.forEach(task => {
                userPrompt += `- Title: ${task.title}, Priority: ${task.priority}, Start Date: ${task.startDate}, End Date: ${task.endDate}, Roles: ${task.roles}\n`;
            });
            userPrompt += "\n";
        }

        if (inProgress.length > 0) {
            userPrompt += "Overdue In Progress Tasks (sorted by start date, then priority):\n";
            inProgress.forEach(task => {
                userPrompt += `- Title: ${task.title}, Priority: ${task.priority}, Start Date: ${task.startDate}, End Date: ${task.endDate}, Roles: ${task.roles}\n`;
            });
            userPrompt += "\n";
        }
        
        if (onTimeNotStarted.length > 0) {
            userPrompt += "On-Time Not Started Tasks (sorted by start date, then priority):\n";
            onTimeNotStarted.forEach(task => {
                userPrompt += `- Title: ${task.title}, Priority: ${task.priority}, Start Date: ${task.startDate}, End Date: ${task.endDate}, Roles: ${task.roles}\n`;
            });
            userPrompt += "\n";
        }

        if (onTimeInProgress.length > 0) {
            userPrompt += "On-Time In Progress Tasks (sorted by start date, then priority):\n";
            onTimeInProgress.forEach(task => {
                userPrompt += `- Title: ${task.title}, Priority: ${task.priority}, Start Date: ${task.startDate}, End Date: ${task.endDate}, Roles: ${task.roles}\n`;
            });
        }
        
        const proxyResponse = await fetch('/api/gemini-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                contents: userPrompt,
                config: {
                    systemInstruction: systemInstruction,
                },
            }),
        });

        if (!proxyResponse.ok) {
            const errorData = await proxyResponse.json();
            throw new Error(errorData.error?.message || `Proxy request failed with status ${proxyResponse.status}`);
        }

        if (!proxyResponse.body) {
            throw new Error("Response body is missing.");
        }

        const reader = proxyResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                fullText += decoder.decode(value, { stream: true });
            }
        } catch (e) {
            console.error("Error reading from stream in aiAnalysisService:", e);
            throw new Error("خطا در دریافت پاسخ از سرویس هوش مصنوعی. ممکن است ارتباط قطع شده باشد یا پاسخ به دلایل ایمنی مسدود شده باشد.");
        }

        return fullText;
        
    } catch (error) {
        console.error("Error generating AI analysis via proxy:", error);
         if (error instanceof Error && error.message.includes("API key")) {
            throw new Error("کلید API برای سرویس هوش مصنوعی پیکربندی نشده است. لطفاً از تنظیم صحیح آن در محیط خود اطمینان حاصل کنید.");
        }
        throw new Error("Failed to communicate with the AI service.");
    }
};