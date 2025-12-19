const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({ 
      host: 'localhost', 
      user: 'root', 
      password: '', 
      database: 'ehr_app' 
    });
    
    const [rows] = await conn.execute(
      `SELECT id, firstName, lastName FROM patients WHERE firstName LIKE '%naomi%' OR firstName LIKE '%Naomi%' OR lastName LIKE '%naomi%' OR lastName LIKE '%Naomi%' ORDER BY firstName`
    );
    
    console.log('Patients matching "Naomi":');
    if (rows.length > 0) {
      rows.forEach(p => console.log(`ID: ${p.id}, Name: ${p.firstName} ${p.lastName}`));
    } else {
      console.log('No patients found matching "Naomi"');
      
      // Let's check all patients to see what's available
      const [allPatients] = await conn.execute(`SELECT id, firstName, lastName FROM patients ORDER BY firstName LIMIT 20`);
      console.log('\nAll patients in database:');
      allPatients.forEach(p => console.log(`ID: ${p.id}, Name: ${p.firstName} ${p.lastName}`));
    }
    
    await conn.end();
  } catch (error) {
    console.error('Database error:', error.message);
  }
})();