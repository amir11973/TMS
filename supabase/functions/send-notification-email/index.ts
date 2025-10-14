// FIX: Declare the 'Deno' global object with a specific type to fix "Cannot find name 'Deno'" errors.
// This is necessary for TypeScript environments that are not configured with Deno's global types,
// ensuring the code can be type-checked correctly.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from "npm:nodemailer";

// Define the structure of the data received from the trigger/webhook
interface WebhookPayload {
  type: 'INSERT' | 'UPDATE';
  table: 'activities' | 'actions';
  record: any;
  old_record: any | null;
}

// The main URL of your application to be placed in the email links
const APP_URL = 'https://tms.parspmi.ir'; // <-- This has been updated to your application's address

serve(async (req) => {
  // Ensure the request is a POST request
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const { record, old_record, type } = payload;

    // Create a Supabase client to access the users table if needed
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use the Service Role key for full access
    );

    let toUsername: string | null = null;
    let subject = '';
    let htmlBody = '';

    // --- Determine the scenario and prepare the email ---

    // Scenario 1: A new task is assigned (INSERT)
    if (type === 'INSERT' && record.responsible) {
      toUsername = record.responsible;
      subject = `[سامانه مدیریت وظایف] وظیفه جدید: ${record.title}`;
      htmlBody = `
        <div dir="rtl" style="font-family: tahoma, sans-serif; text-align: right;">
          <h2>سلام،</h2>
          <p>یک وظیفه جدید با عنوان <strong>"${record.title}"</strong> به شما محول شده است.</p>
          <p>لطفاً برای مشاهده جزئیات و شروع کار، به کارتابل وظایف خود در سامانه مراجعه کنید.</p>
          <a href="${APP_URL}" style="display: inline-block; padding: 10px 20px; background-color: #e94560; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            ورود به سامانه وظایف
          </a>
          <p style="margin-top: 20px; font-size: 0.9em; color: #888;">این یک ایمیل خودکار است. لطفاً به آن پاسخ ندهید.</p>
        </div>
      `;
    }
    // Scenarios 2 & 3: A task is updated (UPDATE)
    else if (type === 'UPDATE') {
      // Scenario 2: Sent for approval
      if (old_record.status !== 'ارسال برای تایید' && record.status === 'ارسال برای تایید') {
        toUsername = record.approver; // Email is sent to the approver
        subject = `[سامانه مدیریت وظایف] درخواست تایید برای: ${record.title}`;
        htmlBody = `
          <div dir="rtl" style="font-family: tahoma, sans-serif; text-align: right;">
            <h2>سلام،</h2>
            <p>یک مورد با عنوان <strong>"${record.title}"</strong> برای تایید شما ارسال شده است.</p>
            <p>این درخواست مربوط به وضعیت <strong>"${record.requestedStatus}"</strong> می‌باشد.</p>
            <p>لطفاً برای بررسی و اقدام، به کارتابل تاییدات خود در سامانه مراجعه کنید.</p>
            <a href="${APP_URL}" style="display: inline-block; padding: 10px 20px; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">
              ورود به سامانه وظایف
            </a>
            <p style="margin-top: 20px; font-size: 0.9em; color: #888;">این یک ایمیل خودکار است. لطفاً به آن پاسخ ندهید.</p>
          </div>
        `;
      }
      // Scenario 3: Review result (approved or rejected)
      else if (old_record.status === 'ارسال برای تایید' && record.status !== 'ارسال برای تایید') {
        toUsername = record.responsible; // Email is sent to the task owner
        const decision = record.approvalStatus === 'approved' ? 'تایید شد' : 'رد شد';
        const decisionColor = record.approvalStatus === 'approved' ? '#28a745' : '#dc3545';
        
        subject = `[سامانه مدیریت وظایف] نتیجه بررسی: "${record.title}" ${decision}`;
        htmlBody = `
          <div dir="rtl" style="font-family: tahoma, sans-serif; text-align: right;">
            <h2>سلام،</h2>
            <p>درخواست تایید شما برای وظیفه <strong>"${record.title}"</strong> بررسی و نتیجه آن به شرح زیر است:</p>
            <p style="font-size: 1.2em; font-weight: bold; color: ${decisionColor};">وضعیت: ${decision}</p>
            <p>برای مشاهده جزئیات بیشتر به کارتابل وظایف خود مراجعه کنید.</p>
            <a href="${APP_URL}" style="display: inline-block; padding: 10px 20px; background-color: #e94560; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">
              ورود به سامانه وظایف
            </a>
            <p style="margin-top: 20px; font-size: 0.9em; color: #888;">این یک ایمیل خودکار است. لطفاً به آن پاسخ ندهید.</p>
          </div>
        `;
      }
    }

    // If no scenario matched, do nothing.
    if (!toUsername || !htmlBody) {
      return new Response('No notification needed for this event.', { status: 200 });
    }

    // --- Send Email using Nodemailer and SMTP ---
    const toEmail = toUsername;

    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = Deno.env.get('SMTP_PORT');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        throw new Error('SMTP configuration secrets (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) are not set.');
    }

    // Create a transporter object using the SMTP transport
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort), // Port is usually 465 (SSL) or 587 (TLS)
        secure: Number(smtpPort) === 465, // `true` for 465, `false` for other ports like 587
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    // Send mail with defined transport object
    const info = await transporter.sendMail({
        from: `"مدیریت پروژه پارس" <${smtpUser}>`, // Sender address with custom name
        to: toEmail,
        subject: subject,
        html: htmlBody,
    });

    console.log("Message sent via SMTP: %s", info.messageId);

    return new Response(JSON.stringify({ success: true, message: `Email sent to ${toEmail} via SMTP.` }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(String(error?.message ?? error), { status: 500 });
  }
});