function isAuthenticated(req, res, next) {
	
  if (req.user) {
    // O usuário está autenticado, permitir o acesso à rota
    next();
  } else {
    // O usuário não está autenticado, redirecionar para a página de login
    res.redirect('/auth/login');
  }
}

module.exports = isAuthenticated;