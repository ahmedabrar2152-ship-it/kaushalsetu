require('dotenv').config();
const fs=require('node:fs');
const path=require('node:path');
const {Pool}=require('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==='true'?{rejectUnauthorized:true}:undefined});
(async()=>{try{const sql=fs.readFileSync(path.join(__dirname,'..','backend','schema.sql'),'utf8');await pool.query(sql);console.log('KaushalSetu schema migration completed.')}catch(e){console.error('Migration failed:',e.message);process.exitCode=1}finally{await pool.end()}})();
