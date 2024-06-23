const { conn } = require('./db');
const { getFile } = require('../controllers/AWSConfig');

class User {
    static findAll() {
        return new Promise((resolve, reject) => {
            conn.query('SELECT * FROM users', (err, results) => {
                if (err) {
					console.error(err)
					let error = new Error("DataBase Error");
					error.status = 500; // Define o status HTTP para o erro
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    }
	
	static async getPic(users) {
		const userPics = await Promise.all(users.map(async (user) => {
			const cleanedUrl = user.profile_pic.includes('https://seknutritionbucket.s3.amazonaws.com/')
							   ? user.profile_pic.replace('https://seknutritionbucket.s3.amazonaws.com/', '')
							   : user.profile_pic;

			if (cleanedUrl.startsWith('profile/')) {
				return getFile(cleanedUrl);  // Aqui você chama getFile para obter a URL assinada
			} else {
				return user.profile_pic;  // Retorna a URL completa se não começar com "profile/"
			}
		}));

		return userPics;
	}
	
	static async findUserByEmail(email) {
		return new Promise((resolve, reject) => {
			const query = 'SELECT * FROM admins WHERE email = ?';
			conn.query(query, [email], (err, results) => {
				if (err) {
					console.error('Database error:', err);
					reject(err);
				} else if (results.length > 0) {
					resolve(results[0]);  // Retorna o primeiro usuário encontrado
				} else {
					resolve(null);  // Nenhum usuário encontrado
				}
			});
		});
	}

	static async findUserById(id) {
		return new Promise((resolve, reject) => {
			const query = 'SELECT * FROM admins WHERE id = ?'; 
			conn.query(query, [id], (err, results) => {
				if (err) {
					console.error('Database error:', err);
					reject(err);
				} else if (results.length > 0) {
					resolve(results[0]);  // Retorna o primeiro usuário encontrado
				} else {
					resolve(null);  // Nenhum usuário encontrado
				}
			});
		});
	}

	static getUserSecret(userId){
		return new Promise((resolve, reject) => {
			const query = 'SELECT secret FROM admins WHERE id=?';
			
			conn.query(query, [userId], (err, results) => {
				if (err) {
					console.error(err);
					reject(err);
					return;
				}
				
				if (results.length > 0) {
					resolve(results[0].secret);  // Garanta que está passando a string secret corretamente
				} else {
					resolve(null);
				}
			});
		});
	}
	
	static getUserData(){
        return new Promise((resolve, reject) => {
            conn.query('SELECT * FROM admin', (err, results) => {
                if (err) {
					console.error(err)
					let error = new Error("DataBase Error");
					error.status = 500; // Define o status HTTP para o erro
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
	}
	
static async deleteUserData(userId) {
    return new Promise((resolve, reject) => {
        const querySelect = 'SELECT * FROM users WHERE user_id_info=?';

        conn.query(querySelect, [userId], (err, resultSelect) => {
            if (err) {
                console.error(err);
                reject(err);
                return;
            }

            if (resultSelect.length > 0) {
                const deleteQuery = 'DELETE FROM users WHERE user_id_info = ?';

                conn.query(deleteQuery, [userId], (err, resultDelete) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        resolve(resultDelete); // Resolve a promessa com o resultado da deleção
                    }
                });
            } else {
                resolve("No user found with the provided userId"); // Resolve com mensagem se nenhum usuário for encontrado
            }
        });
    });
}

}

module.exports = User;
