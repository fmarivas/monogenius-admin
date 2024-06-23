require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 7990;

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); 
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const bcrypt = require('bcrypt')

const routes = require('./routes/routes');
const { conn } = require('./models/db');
const User = require('./models/user')

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(flash());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Guardar as sessões
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 900000,  // Limpa as sessões expiradas a cada 15 minutos
  expiration: 3600000,  // Sessões expiram após 24 horas
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',  // Nome específico para a tabela de sessões de administradores
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, conn);

app.set('trust proxy', 1); // Confia no primeiro proxy

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false, //antes true
  store: sessionStore, //Aqui
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // Uso de HTTPS
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24,
  }  
}));


// Configurando a estratégia local do Passport
passport.use(new LocalStrategy({
    usernameField: 'email',  // Campo que estamos usando como 'username' no formulário
    passwordField: 'password'  // Campo para a senha no formulário
  },
  async (email, password, done) => {
    try {
      const user = await User.findUserByEmail(email);
	  
      if (!user) {
        return done(null, false, { errorMessage: 'Email not found.' });
      }
      const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordMatch) {
        return done(null, false, { errorMessage: 'Invalid password.' });
      }
      return done(null, user); // `user` será armazenado na sessão
    } catch (error) {
      return done(error);
    }
  }
));

// Configurando o serialize e deserialize do usuário no Passport
passport.serializeUser((user, done) => {
  done(null, user);  // Armazena apenas o ID do usuário na sessão
});

passport.deserializeUser(async (profile, done) => {
  try {
    const user = await User.findUserById(profile.id); // Certifique-se de que você tem essa função para buscar o usuário pelo ID
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());



app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);


//error
app.use((err, req, res, next) => {
  if (err.status === 403) {
    res.status(403).sendFile(path.join(__dirname, 'public', 'error', 'error403.html'));
  } else if (err.status === 404) {
    res.sendFile(path.join(__dirname, 'public', 'error', 'error404.html'));
  } else {
    console.error(err.stack);
    res.status(500).sendFile(path.join(__dirname, 'public', 'error', 'error500.html'));
  }
});

app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
