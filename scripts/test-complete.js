const { db } = require('../lib/db');

async function testComplete() {
  try {
    // Verificar categorias
    const [categories] = await db.execute(
      `SELECT c.id, c.name, COUNT(d.id) as datasetsCount
       FROM Category c
       LEFT JOIN Dataset d ON d.categoryId = c.id
       GROUP BY c.id`
    );
    
    console.log('=== CATEGORIES ===');
    categories.forEach(category => {
      console.log(`${category.name} (ID: ${category.id}): ${category.datasetsCount} datasets`);
    });
    
    console.log('\n=== DATASETS BY CATEGORY ===');
    for (const category of categories) {
      const [datasets] = await db.execute(
        `SELECT title, format FROM Dataset WHERE categoryId = ? LIMIT 2`,
        [category.id]
      );
      
      console.log(`\n${category.name}:`);
      datasets.forEach(dataset => {
        console.log(`  - ${dataset.title} (${dataset.format})`);
      });
    }
    
    console.log('\n=== FORMATOS DISPONÍVEIS ===');
    const [formats] = await db.execute(
      `SELECT DISTINCT format FROM Dataset WHERE format IS NOT NULL`
    );
    
    formats.forEach(format => {
      console.log(`- ${format.format}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {}
}

testComplete();