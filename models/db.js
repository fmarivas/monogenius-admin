require('dotenv').config();
const mysql = require('mysql');
const axios = require('axios');
const { google } = require('googleapis');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_monogenius'
};

const conn = mysql.createConnection(dbConfig)

conn.connect((err) =>{
	if(err){
		console.error(err)
		return;
	}
});

module.exports= {
	conn
}