const { Resend } = require('resend');
const { v4: uuidv4 } = require('uuid');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing email' }),
      };
    }

    const token = uuidv4();
    const resetLink = `https://sbiz-osekpatour.netlify.app/custom-reset-password?token=${token}`;

    const message = `
      <p>שלום,</p>
      <p>קיבלת את ההודעה הזו כי התבקשה איפוס סיסמה לאפליקציית SBIZ.</p>
      <p><a href="${resetLink}">לחצי כאן לאיפוס סיסמה</a></p>
      <p>אם לא את ביצעת את הבקשה, ניתן להתעלם מהמייל הזה.</p>
    `;

    const data = await resend.emails.send({
      from: 'Sylvie SBIZ <onboarding@resend.dev>',
      to: [email],
      subject: 'איפוס סיסמה לאפליקציית SBIZ',
      html: message,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Reset email sent', token }),
    };
  } catch (error) {
    console.error('Error sending reset email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

