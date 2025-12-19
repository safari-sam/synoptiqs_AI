const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({ 
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'ehr_app' 
  });
  
  const [rows] = await conn.execute(
    `SELECT id, firstName, lastName FROM patients WHERE firstName IN (?, ?, ?) ORDER BY firstName`,
    ['Hans', 'Maria', 'Naomi']
  );
  
  console.log('Patients found:');
  rows.forEach(p => console.log(`ID: ${p.id}, Name: ${p.firstName} ${p.lastName}`));
  
  await conn.end();
})().catch(console.error);