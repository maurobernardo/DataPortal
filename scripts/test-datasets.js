const { db } = require('../lib/db');

async function testDatasets() {
  try {
    const [datasets] = await db.execute(
      `SELECT d.id, d.title, d.format, c.name as categoryName
       FROM Dataset d
       LEFT JOIN Category c ON d.categoryId = c.id
       LIMIT 5`
    );
    
    console.log('Total datasets:', datasets.length);
    console.log('Sample datasets:');
    datasets.forEach(dataset => {
      console.log(`- ID: ${dataset.id}, Title: ${dataset.title}, Category: ${dataset.categoryName}, Format: ${dataset.format}`);
    });
    
    // Testar filtro por categoria
    const [categoryTest] = await db.execute(
      `SELECT id, title, format FROM Dataset WHERE categoryId = ? LIMIT 3`,
      [1]
    );
    
    console.log('\nDatasets with categoryId = 1:', categoryTest.length);
    
    // Testar filtro por formato
    const [formatTest] = await db.execute(
      `SELECT id, title, format FROM Dataset WHERE format = ? LIMIT 3`,
      ['Shapefile']
    );
    
    console.log('Datasets with format = Shapefile:', formatTest.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {}
}

testDatasets();