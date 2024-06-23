require('dotenv').config()

// jwtUtils.js
const jwt = require('jsonwebtoken');

// Função para gerar um token JWT
function generateToken(payload, expiresIn) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

// Função para verificar e decodificar um token JWT
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports = { generateToken, verifyToken };
