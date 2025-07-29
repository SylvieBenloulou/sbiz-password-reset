
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const { v4: uuidv4 } = require('uuid');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email } = JSON.parse(event.body);
  if (!email) {
    return { statusCode: 400, body: 'Email is required' };
  }

  const { data: user, error: userError } = await supabase
    .from('custom_users')
    .select('id')
    .eq('email', email)
    .single();

  if (userError || !user) {
    return { statusCode: 404, body: 'User not found' };
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('custom_users')
    .update({ reset_token: token, expires_at: expiresAt })
    .eq('email', email);

  if (updateError) {
    return { statusCode: 500, body: 'Error updating reset token' };
  }

  const resetUrl = `https://sbiz-osekpatour.netlify.app/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'איפוס סיסמה ל־SBIZ',
      html: `<p>קיבלת בקשה לאיפוס סיסמה. כדי להמשיך, לחצי על הקישור הבא:</p>
             <p><a href="${resetUrl}">איפוס סיסמה</a></p>
             <p>הלינק בתוקף ל־15 דקות.</p>`
    });
  } catch (emailError) {
    return { statusCode: 500, body: 'Failed to send email' };
  }

  return { statusCode: 200, body: JSON.stringify({ message: 'Reset email sent' }) };
};
