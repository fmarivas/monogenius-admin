const { conn } = require('./db');
const { getFile } = require('../controllers/AWSConfig');
const util = require('util');

const query = util.promisify(conn.query).bind(conn);

class User {
    static async findAll() {
        try {
            const results = await query('SELECT * FROM users');
            return results;
        } catch (err) {
            console.error(err);
            throw new Error("Database Error");
        }
    }

    static async getPic(users) {
        try {
            const userPics = await Promise.all(users.map(async (user) => {
                const cleanedUrl = user.profile_pic.includes('https://seknutritionbucket.s3.amazonaws.com/')
                    ? user.profile_pic.replace('https://seknutritionbucket.s3.amazonaws.com/', '')
                    : user.profile_pic;

                if (cleanedUrl.startsWith('profile/')) {
                    return getFile(cleanedUrl);
                } else {
                    return user.profile_pic;
                }
            }));
            return userPics;
        } catch (err) {
            console.error(err);
            throw new Error("Error fetching user pictures");
        }
    }

    static async findUserByEmail(email) {
        try {
            const results = await query('SELECT * FROM admins WHERE email = ?', [email]);
            return results.length > 0 ? results[0] : null;
        } catch (err) {
            console.error('Database error:', err);
            throw err;
        }
    }

    static async findUserById(id) {
        try {
            const results = await query('SELECT * FROM admins WHERE id = ?', [id]);
            return results.length > 0 ? results[0] : null;
        } catch (err) {
            console.error('Database error:', err);
            throw err;
        }
    }

    static async getUserSecret(userId) {
        try {
            const results = await query('SELECT secret FROM admins WHERE id=?', [userId]);
            return results.length > 0 ? results[0].secret : null;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    static async getUserData() {
        try {
            const results = await query('SELECT * FROM admin');
            return results;
        } catch (err) {
            console.error(err);
            throw new Error("Database Error");
        }
    }

    static async deleteUser(userId) {
        try {
            const result = await query('DELETE FROM users WHERE id = ?', [userId]);
            if (result.affectedRows === 0) {
                return { success: false, message: 'Usuário não encontrado' };
            }
            return { success: true, message: 'Usuário deletado com sucesso' };
        } catch (err) {
            console.error('Erro ao deletar usuário:', err);
            throw new Error('Erro ao deletar usuário');
        }
    }
}

module.exports = User;