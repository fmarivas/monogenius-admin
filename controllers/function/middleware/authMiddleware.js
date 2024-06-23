// authMiddleware.js
const { verifyToken } = require('../jwtUtils');

function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]; // Obtém o token do cabeçalho Authorization

    if (!token) {
        return res.status(401).json({ message: 'Token de autenticação ausente' });
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken) {
        return res.status(401).json({ message: 'Token de autenticação inválido' });
    }

    // Anexa os dados do usuário decodificados ao objeto de solicitação para uso posterior
    req.user = decodedToken;
    next(); // Avança para o próximo middleware ou rota
}

module.exports = authenticate;
