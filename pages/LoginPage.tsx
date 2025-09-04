/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, FormEvent } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';

export const LoginPage = ({ onLogin, onSignUp }: {
    onLogin: (user: Omit<User, 'password_hash'>) => void;
    onSignUp: (credentials: { username: string, password: string, fullName: string }) => Promise<{ data?: any; error?: any; }>;
}) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            if (isLoginView) {
                const { data: user, error: dbError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('username', username)
                    .eq('password_hash', password)
                    .single();

                if (dbError || !user) {
                    setError('نام کاربری یا رمز عبور اشتباه است.');
                    return;
                }

                if (user.is_active) {
                    const { password_hash, ...userToLogin } = user;
                    onLogin(userToLogin);
                } else {
                    setError('حساب کاربری شما غیرفعال است. لطفا با مدیر سیستم تماس بگیرید.');
                }
            } else {
                if (password !== confirmPassword) {
                    setError('رمز عبور و تکرار آن یکسان نیستند.');
                    return;
                }
                const { error: signUpError } = await onSignUp({ username, password, fullName });
                if (signUpError) {
                    setError(signUpError.message || 'خطا در ایجاد حساب کاربری.');
                } else {
                    setSuccessMessage('حساب کاربری با موفقیت ایجاد شد. اکنون می‌توانید وارد شوید.');
                    setIsLoginView(true);
                    setPassword('');
                    setConfirmPassword('');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    // This function resets state when switching views
    const handleViewChange = (newViewIsLogin: boolean) => {
        if (isLoginView !== newViewIsLogin) {
            setIsLoginView(newViewIsLogin);
            setError('');
            setSuccessMessage('');
            setFullName('');
            setUsername('');
            setPassword('');
            setConfirmPassword('');
        }
    };

    return (
        <div className="login-container">
             {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-box">
                        <div className="spinner"></div>
                        <span>لطفا منتظر باشید...</span>
                    </div>
                </div>
            )}
            <form className="login-form" onSubmit={handleSubmit}>
                <img src="https://parspmi.ir/uploads/c140d7143d9b4d7abbe80a36585770bc.png" alt="ParsPMI Logo" className="login-logo" />
                <div className="login-toggle-buttons">
                    <button 
                        type="button" 
                        className={`toggle-btn ${isLoginView ? 'active' : ''}`} 
                        onClick={() => handleViewChange(true)}
                    >
                        ورود
                    </button>
                    <button 
                        type="button" 
                        className={`toggle-btn ${!isLoginView ? 'active' : ''}`} 
                        onClick={() => handleViewChange(false)}
                    >
                        ثبت نام
                    </button>
                </div>
                {successMessage && <p className="success-message">{successMessage}</p>}
                {!isLoginView && (
                     <div className="input-group">
                        <label htmlFor="full-name">نام و نام خانوادگی</label>
                        <input 
                            type="text" 
                            id="full-name" 
                            value={fullName} 
                            onChange={e => setFullName(e.target.value)} 
                            required 
                        />
                    </div>
                )}
                <div className="input-group">
                    <label htmlFor="username">{isLoginView ? 'نام کاربری' : 'ایمیل'}</label>
                    <input 
                        type={isLoginView ? "text" : "email"} 
                        id="username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        placeholder={!isLoginView ? "ایمیل خود را وارد کنید" : ""}
                        required 
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="password">رمز عبور</label>
                    <input 
                        type="password" 
                        id="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder={!isLoginView ? "حداقل ۶ کارکتر" : ""}
                        required 
                    />
                </div>
                {!isLoginView && (
                    <div className="input-group">
                        <label htmlFor="confirm-password">تکرار رمز عبور</label>
                        <input 
                            type="password" 
                            id="confirm-password" 
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)} 
                            placeholder="رمز عبور را تکرار کنید"
                            required 
                        />
                    </div>
                )}
                <button type="submit" className="login-button">{isLoginView ? 'ورود' : 'ایجاد حساب'}</button>
                {error && <p className="error-message">{error}</p>}
            </form>
        </div>
    );
};