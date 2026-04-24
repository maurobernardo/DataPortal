import { db } from './lib/db'

async function checkCategories() {
  try {
    const [categories] = await db.execute(
      'SELECT id, name, description FROM Category ORDER BY id ASC'
    ) as any
    
    console.log('Current categories in database:');
    categories.forEach((cat: any) => {
      console.log(`ID: ${cat.id}, Name: ${cat.name}, Description: ${cat.description}`);
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
  } finally {}
}

checkCategories();