// api/auth/callback.js
// OAuth callback handler for Gmail and Outlook

export default async function handler(req, res) {
    const { code, state, provider } = req.query;

    if (!code) {
        res.status(400).json({ error: 'Authorization code missing' });
        return;
    }

    try {
        let accessToken, refreshToken, userEmail;

        if (provider === 'gmail' || state === 'gmail') {
            // Exchange Google OAuth code for tokens
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    code: code,
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    redirect_uri: `${process.env.BASE_URL}/api/auth/callback?provider=gmail`,
                    grant_type: 'authorization_code'
                })
            });

            const tokens = await tokenResponse.json();
            accessToken = tokens.access_token;
            refreshToken = tokens.refresh_token;

            // Get user email from Google
            const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            const userData = await userResponse.json();
            userEmail = userData.email;

        } else if (provider === 'outlook' || state === 'outlook') {
            // Exchange Microsoft OAuth code for tokens
            const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    code: code,
                    client_id: process.env.MICROSOFT_CLIENT_ID,
                    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                    redirect_uri: `${process.env.BASE_URL}/api/auth/callback?provider=outlook`,
                    grant_type: 'authorization_code',
                    scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send'
                })
            });

            const tokens = await tokenResponse.json();
            accessToken = tokens.access_token;
            refreshToken = tokens.refresh_token;

            // Get user email from Microsoft Graph
            const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            const userData = await userResponse.json();
            userEmail = userData.mail || userData.userPrincipalName;
        }

        // TODO: Store tokens in database
        // For now, store in session/cookie
        // In production, encrypt and store in database with user ID

        // Store in secure HTTP-only cookie
        res.setHeader('Set-Cookie', [
            `oauth_provider=${provider}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/`,
            `oauth_email=${userEmail}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/`,
            // DO NOT store access token in cookie in production - use database
        ]);

        // Redirect to dashboard
        res.redirect(302, '/dashboard.html?connected=true');

    } catch (error) {
        console.error('OAuth error:', error);
        res.redirect(302, '/dashboard.html?error=auth_failed');
    }
}
