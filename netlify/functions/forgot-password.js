const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    const { data: user, error: userError } = await supabase
      .from('user_subscriptions')
      .select('email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'If an account with that email exists, we sent a reset link.'
        }),
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // שעה

    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        email: email,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (tokenError) {
      console.error('❗ Token storage error:', tokenError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to process reset request' }),
      };
    }

    const resetUrl = `${process.env.APP_BASE_URL}/reset-password?token=${resetToken}`;
    console.log('👉 Attempting to send to:', email);
    console.log('👉 resetUrl:', resetUrl);
    console.log('📧 FROM_EMAIL env:', process.env.FROM_EMAIL); // שורת הבדיקה
console.log('📧 Using API KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing');

    const { error: emailError, data: emailResponse } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'איפוס סיסמה - SBIZ',
      html: `
        <div style="font-family: Arial; direction: rtl; max-width: 600px; margin: 0 auto;">
          <h2>בקשת איפוס סיסמה</h2>
          <p>לחצי על הכפתור מטה כדי לאפס את הסיסמה שלך:</p>
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">איפוס סיסמה</a>
          <p>הקישור תקף לשעה בלבד.</p>
        </div>
      `
    });

    console.log('📬 Email Response:', emailResponse);

    if (emailError) {
      console.error('❗ Email Error:', emailError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to send reset email' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'If an account with that email exists, we sent a reset link.'
      }),
    };

  } catch (error) {
    console.error('❗ Forgot password error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
