require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwtUtils = require('../jwtUtils');

class Security {
    // Função para gerar uma chave segura
    static generateJWTSecret() {
        return crypto.randomBytes(32).toString('hex'); // Gera uma string hexadecimal de 32 bytes
    }

    static async generateToken(email) {
		try {
			const token = await jwtUtils.generateToken({ email: email }, "1h");
			return token;
		} catch (err) {
			console.error(err);
			throw err;
		}
        
    } 
	
	static async generatePasswordHash(password) {
		const saltRounds = 10;  // Aumente o número para mais segurança, mas leva mais tempo
		try {
			const hash = await bcrypt.hash(password, saltRounds);
			return hash;
		} catch (error) {
			console.error('Error hashing password:', error);
		}
		return null;
	}	

	static async generatePublicKey(){
		// Gera um token aleatório de 32 bytes (256 bits) em formato hexadecimal
		const publicRouteToken = crypto.randomBytes(32).toString('hex');
		console.log(publicRouteToken);			
	}
}

// Security.generatePasswordHash('Olvinha01').then(hash => {
    // console.log('Password Hash:', hash);
// })
module.exports = Security;
