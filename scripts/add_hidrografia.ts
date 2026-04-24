import { db } from '../lib/db'

async function addHidrografiaCategory() {
  try {
    // Verificar se a categoria já existe
    const [rows] = await db.execute(
      'SELECT id, name, description FROM Category WHERE name = ? LIMIT 1',
      ['Hidrografia']
    ) as any
    const existingCategory = rows[0] || null

    if (existingCategory) {
      console.log('A categoria "Hidrografia" já existe no banco de dados.');
      return;
    }

    // Criar a categoria "Hidrografia"
    await db.execute(
      `INSERT INTO Category (name, description, dataType, createdAt, updatedAt)
       VALUES (?, ?, 'geoespacial', NOW(), NOW())`,
      ['Hidrografia', 'Corpos d\'água e recursos hídricos']
    )

    const [newRows] = await db.execute(
      'SELECT id, name, description FROM Category WHERE name = ? LIMIT 1',
      ['Hidrografia']
    ) as any
    const newCategory = newRows[0]

    console.log('Categoria "Hidrografia" adicionada com sucesso!');
    console.log(`ID: ${newCategory.id}, Nome: ${newCategory.name}, Descrição: ${newCategory.description}`);
  } catch (error) {
    console.error('Erro ao adicionar a categoria "Hidrografia":', error);
  } finally {}
}

addHidrografiaCategory();