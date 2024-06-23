const Authorization = require('../function/authorization')

function checkUserHasDetails(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    Authorization.checkUserDetails(req.session.user.user_id_info)
        .then(hasDetails => {
            if (hasDetails) {
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


module.exports = checkUserHasDetails