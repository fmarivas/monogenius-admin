require('dotenv').config()
const express = require('express')
const router = express.Router()

const path = require('path')
const multer = require('multer');
const upload = multer();
const { check, validationResult } = require('express-validator');
const passport = require('passport');
const NodeCache = require('node-cache')
const tokenCache = new NodeCache()

const User = require('../models/user')
const platformData = require('../models/platformMetrics')

const keygen = require('../controllers/keygen/keygen')
const authenticator = require('../controllers/function/Authenticator')
const isAuth = require('../controllers/function/middleware/auth')

const pageResources = require('../controllers/config/pageResources')

const loginValidators = [
    check('email').isEmail().withMessage('Enter a valid email address'),
];

router.get('/', (req,res) =>{
	res.redirect('/auth/login')
})

router.get('/auth/login', (req,res) =>{
	res.render('login')
})

const routes = {
  'verify': (req,res)=>{
		if (!req.session.loggedIn) {  // Garante que o usuário está autenticado
			return res.redirect('/auth/login');
		}	  
	  res.render('two-factor-auth');
  },
  'logout': (req,res,next) => {
    req.session.destroy((err) => {
        if (err) {
            // Trata o erro se houver falha ao destruir a sessão
            console.error("Erro ao destruir a sessão:", err);
			let error = new Error("Erro ao realizar o logout");
			error.status = 500;
			next(error);			
        } else {
            // Redireciona para a página de login ou para a página inicial após o logout
            res.redirect('/auth/login');
        }
    });
  },
  'setup-2fa': async (req,res) =>{
		const userId = req.user.id; // Certifique-se de que o userId está disponível na sessão
		const userEmail = req.user.email
		try {
			const qrCodeImageUrl = await authenticator.generateQRCode(userId, userEmail);
			res.render('setup-2fa', { qrCodeImageUrl }); // Sempre passe a variável, mesmo que null
		} catch (error) {
			console.error(error);
			res.render('setup-2fa', { qrCodeImageUrl: null, message: "Failed to generate QR Code. Please try again." });
		}
  },
  'get-public-token': (req, res) => {
    const requestOrigin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const allowedHosts = process.env.ALLOWED_HOSTS.split(',');
    if (allowedHosts.some(host => {
      try {
        const url = new URL(requestOrigin);
        return url.host === host;
      } catch (err) {
        return false;
      }
    })) {
      res.json({ token: process.env.PUBLIC_ROUTE_TOKEN });
    } else {
      res.status(403).json({ error: 'Origem não permitida' });
    }
  },
  'get-token': async (req,res)=>{
	try{
		const userEmail = req.user.email;
		
		 // Verifica se o token está presente no cache para o usuário atual
		 const cachedToken = tokenCache.get(userEmail);
		 
		 if(cachedToken){
			 res.json({ token: cachedToken });
		 }else{
			const NewToken = await keygen.generateToken({email: userEmail}, '1h')
			tokenCache.set(userEmail, NewToken, 3600) 
			res.json({NewToken})
		 }
	}catch(err){
		console.error(err)
		res.status(500).json({ error: 'Erro interno do servidor' });
	}	  
  }  
};

router.get('/:id', (req, res, next) => {
  const id = req.params.id;
  const route = routes[id];

  if (typeof route === 'function') {
    route(req, res);
  } else if (route) {
    res.render(route);
  } else {
    let error = new Error("Page not found");
    error.status = 404;
    next(error);
  }
});


router.get('/c/:id', isAuth, async (req,res,next) => {
	const id = req.params.id
	
	const pageDetails = {
		dashboard: { name: 'Dashboard', icon: 'fa-solid fa-house' },
		performance_analysis: { name: 'Performance', icon: 'fas fa-chart-line' },
		financial_management: { name: 'Financial', icon: 'fas fa-money-bill-wave' },
		error_management: { name: 'Error', icon: 'fas fa-exclamation-circle' },
		employee_management: { name: 'Employee', icon: 'fas fa-user-tie' },
		customer_support: { name: 'Support', icon: 'fas fa-headset' }
	};
	
	let usersData
	let imgData
	try{
		usersData = await User.findAll()
        imgData = await User.getPic(usersData)
	}catch(err){
		console.error(err)
		let error = new Error("Erro de processamento. Tente mais tarde");
		error.status = 500; // Define o status HTTP para o erro
		next(error); // Passa o erro para o middleware de erro		
	}
	
    if (pageDetails[id]) {
        res.render('layout', {
            title: pageDetails[id].name,
            body: id,
            pageDetails: pageDetails,
            page: id,
			usersData: usersData,
			imgData: imgData,
			user: req.user,
			pageResources: pageResources[id] || {},
        });
    } else {
		let error = new Error("Page not found");
		error.status = 404; // Define o status HTTP para o erro
		next(error); // Passa o erro para o middleware de erro			
    }
})


router.get('/api/:id', isAuth, async (req, res) => {
  const id = req.params.id;
  const { startDate, endDate, period } = req.query; 
  
  const validAPIRoutes = ['users', 'page_visits', 'user_retention', 'revenue'];
  
  if (validAPIRoutes.includes(id)) {
    try {
      if (id === 'users') {
        const usersData = await platformData.getTotalUsers();
        res.json(usersData);
      }else if (id === 'page_visits') {
		  let start, end;

		  if (period === 'month') {
			const now = new Date();
			start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
			end = now.toISOString().split('T')[0];
		  } else if (period === '28days') {
			start = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			end = new Date().toISOString().split('T')[0];
		  } else {
			start = startDate || '30daysAgo';
			end = endDate || 'today';
		  }
        const visits = await platformData.getVisits(start, end);
        res.json(visits);
		
      }else if(id === 'user_retention'){
		let start, end

		start = startDate || '30daysAgo';
		end = endDate || 'today';	

		const userRetention = await platformData.getUserRetention(start, end)
		
		res.json(userRetention)
	  }else if(id === 'revenue'){
		  let start = startDate || '30daysAgo';
		  let end = endDate || 'today'; 
		  
			const revenueData = await platformData.getRevenue(start, end);
			res.json(revenueData);		  
	  }
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(404).json({ message: 'API not found' });
  }
});



//POST
router.post('/login', loginValidators, (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            // Se usar connect-flash ou flash similar para mensagens de erro
            req.flash('error', {errorMessage: info.message});
            return res.redirect('/auth/login');	
        }
		
		console.log(user)
		console.log(req.session.loggedIn)
		
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            req.session.loggedIn = true;  // Passou pelo primeiro fator
            req.session.isAuthenticated = false; 
			
            if (req.body.rememberMe) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;  // 30 dias
            } else {
                req.session.cookie.expires = false;  // Expira ao fechar o navegador
            }
            return res.redirect('/verify');
        });
    })(req, res, next);
});


	router.post('/verify-2fa', async (req, res) => {
		const tokenParts = req.body.token;
		
		if (!tokenParts || !Array.isArray(tokenParts)) {
			return res.render('two-factor-auth', { errorMessage: "Invalid token data." });
		}

		const userToken = tokenParts.join('');
		
		try {
			const userSecretData = await User.getUserSecret(req.user.id);
			
			if (!userSecretData) {
				return res.render('two-factor-auth', { errorMessage: "No secret found for user." });
			}

			const is2faValid = await authenticator.verifyTwoFactorAuthCode(userSecretData, userToken);
			if (is2faValid) {
					req.session.isAuthenticated = true;
					req.session.loggedIn = null;

					req.session.save(err => {
						if (err) {
							console.error('Error saving session:', err);
							return res.render('two-factor-auth', { errorMessage: "An error occurred. Please try again." });
						}

						res.redirect('/c/dashboard');
					});
				
			} else {
				req.flash('error', 'Invalid 2FA code.');
				return res.render('two-factor-auth', { errorMessage: "Invalid 2FA code." });
			}
			
			
		} catch (error) {
			console.error(error);
			res.render('two-factor-auth', { errorMessage: "An error occurred while verifying 2FA code." });
		}
	});


router.delete('/delete-user', isAuth, async (req, res) => {
    try {
        const userId = req.body.userId;
        const result = await manageUsers.Users.deleteUser(userId);
        if (result.success) {
            res.json({ message: 'Usuário deletado com sucesso.' });
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router