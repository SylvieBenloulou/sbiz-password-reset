
# SBIZ - איפוס סיסמה

פונקציית forgot-password שמריצה קוד דרך Netlify ושולחת מייל עם טוקן איפוס סיסמה.

## קבצים חשובים:
- netlify/functions/forgot-password.js – הקוד שמטפל בבקשת האיפוס
- netlify.toml – הגדרות Netlify
- package.json – החבילות שצריך
- .env.example – משתנים להגדרה ב-Netlify

## משתני סביבה:
יש להגדיר את המשתנים הבאים ב־Netlify:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
