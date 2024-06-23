const Authorization = require('../function/authorization')

function checkUserHowKnew(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    Authorization.checkHowKnew(req.session.user.id)
        .then(hasHowKnew => {
            if (hasHowKnew) {
                res.redirect('/dashboard?page=profile');
            } else {
                next(); // Usuário não preencheu o formulário, permita acesso à rota
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Erro ao verificar detalhes do usuário");
        });
}


module.exports = checkUserHowKnew