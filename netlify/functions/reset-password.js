const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
    const { token, newPassword } = JSON.parse(event.body);

    if (!token || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token and new password are required' }),
      };
    }

    if (newPassword.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters long' }),
      };
    }

    const { data: resetData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !resetData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired reset token' }),
      };
    }

    const now = new Date();
    const expiresAt = new Date(resetData.expires_at);

    if (now > expiresAt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Reset token has expired' }),
      };
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ password_hash: hashedPassword })
      .eq('email', resetData.email);

    if (updateError) {
      console.error('Password update error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update password' }),
      };
    }

    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Password updated successfully' }),
    };

  } catch (error) {
    console.error('Reset password error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
