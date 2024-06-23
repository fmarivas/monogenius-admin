const { conn } = require('../../models/db');

const verifyUserPoints = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    const user_id_info = req.session.user.user_id_info;
    const query = 'SELECT points FROM users WHERE user_id_info = ?';

    conn.query(query, [user_id_info], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erro no servidor');
        }

        if (result.length > 0 && result[0].points > 0) {
            next();
        } else {
			res.json({ redirect: true, url: '/points-system' });
        }
    });
};

module.exports = verifyUserPoints;
