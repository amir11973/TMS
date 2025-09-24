

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

export type Note = {
    id: number;
    item_id: number;
    item_type: 'activity' | 'action';
    content: string;
    author_username: string;
    is_private: boolean;
    created_at: string;
    updated_at: string;
};
// FIX: Add Web Speech API type definitions to resolve TypeScript errors in ChatbotModal.tsx.
interface SpeechGrammar {
    src: string;
    weight: number;
}

export interface SpeechGrammarList {
    readonly length: number;
    addFromString(string: string, weight?: number): void;
    addFromURI(src: string, weight?: number): void;
    item(index: number): SpeechGrammar;
    [index: number]: SpeechGrammar;
}

export interface SpeechRecognitionAlternative {
    readonly confidence: number;
    readonly transcript: string;
}

export interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

export interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    grammars: SpeechGrammarList;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    abort(): void;
    start(): void;
    stop(): void;
}

interface SpeechRecognitionStatic {
    new (): SpeechRecognition;
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
    }
}
