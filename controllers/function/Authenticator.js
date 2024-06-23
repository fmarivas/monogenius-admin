// Authenticator.js
const speakeasy = require('speakeasy');
const User = require('../../models/user')
const QRCode = require('qrcode');

class Authenticator {
    static async generateQRCode(userId, email) {
        try {
            const userSecretData = await User.getUserSecret(userId);
			
            if (!userSecretData) {
                throw new Error("No secret found for user.");
            }

            const otpauthUrl = speakeasy.otpauthURL({
                secret: userSecretData,
                label: encodeURIComponent(`MONOGENIUS:${email}`),  // Personalize conforme necessário
                issuer: 'MONOGENIUS',  // Nome da sua empresa ou aplicação
                encoding: 'base32'
            });

            return await QRCode.toDataURL(otpauthUrl);
        } catch (error) {
            console.error('Error generating QR code:', error);
            throw error;
        }
    }
	
	static async verifyTwoFactorAuthCode(secret, token) {
		try {
			const tokenValidates = speakeasy.totp.verify({
				secret: secret,
				encoding: 'base32',
				token: token,
				window: 1 // Este é o número de janelas de 30 segundos permitidas. Pode precisar ajustar se houver problemas de sincronização de tempo.
			});
			
			return tokenValidates;
		} catch (error) {
			console.error('Error verifying 2FA code:', error);
			throw error;
		}
	}
 
}

module.exports = Authenticator;
